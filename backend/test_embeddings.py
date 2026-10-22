"""
Tests for the pluggable embedding backends, with the real google-genai SDK talking to a local stand-in
for Google's embedding/generation endpoints. They check request shape, batching, normalisation, error
handling and the full chat flow on the hosted (Gemini embeddings) backend.
"""
import hashlib
import json
import os
import shutil
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

import numpy as np
from fastapi.testclient import TestClient
from google import genai
from google.genai import types

from backend.auth.firebase_auth import get_current_user
from backend.chat import embeddings, llm
from backend.chat import index as paper_index
from backend.db.database import get_db_connection, get_or_create_user, init_db, save_paper, seed_default_papers
from backend.main import app
from backend.routers.papers import STORAGE_DIR
from backend.test_chat import ABSTRACT, LIMITS, METHODS, _make_pdf

KEY = "test-key-not-real"
DIM = 64


def fake_vector(text: str) -> list:
    """Bag-of-words hashing: texts sharing words get similar vectors, like a (crude) real embedding."""
    v = np.zeros(DIM, dtype=np.float32)
    for word in text.lower().split():
        word = word.strip(".,?!:;()[]\"'")
        if word:
            v[int(hashlib.md5(word.encode()).hexdigest(), 16) % DIM] += 1.0
    return (v * 3.0).tolist()  # deliberately not unit length


class FakeGoogle:
    def __init__(self):
        self.embed_requests = []  # one entry per HTTP request: list of per-text request dicts
        self.generate_requests = []
        self.embed_error = None
        self.short_embeddings = False
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):  # noqa: N802
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
                if self.path.endswith(":batchEmbedContents"):
                    reqs = body.get("requests", [])
                    outer.embed_requests.append(reqs)
                    if outer.embed_error:
                        return self._send(*outer.embed_error)
                    reqs_out = reqs[:-1] if outer.short_embeddings else reqs
                    texts = [r["content"]["parts"][0]["text"] for r in reqs_out]
                    return self._send(200, {"embeddings": [{"values": fake_vector(t)} for t in texts]})
                outer.generate_requests.append(body)
                return self._send(
                    200,
                    {"candidates": [{"content": {"role": "model", "parts": [{"text": "The authors used Adam [1]."}]}, "finishReason": "STOP"}]},
                )

            def _send(self, status, payload):
                data = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def use_fake(fake: FakeGoogle):
    llm._clients.clear()
    llm._clients[KEY] = genai.Client(
        api_key=KEY,
        http_options=types.HttpOptions(base_url=fake.url, timeout=5000, retry_options=types.HttpRetryOptions(attempts=1)),
    )


class GeminiBackendCase(unittest.TestCase):
    def setUp(self):
        self.fake = FakeGoogle()
        self.env = mock.patch.dict(os.environ, {"EMBEDDING_BACKEND": "gemini", "GEMINI_API_KEY": KEY, "GEMINI_MODEL": "gemini-test-model", "GEMINI_FALLBACK_MODEL": ""})
        self.env.start()
        use_fake(self.fake)

    def tearDown(self):
        self.env.stop()
        llm._clients.clear()
        self.fake.close()


class TestGeminiEmbeddings(GeminiBackendCase):
    def test_backend_selection_and_profile(self):
        self.assertEqual(embeddings.backend_name(), "gemini")
        self.assertTrue(embeddings.profile().id.startswith("gemini:gemini-embedding-001"))
        with mock.patch.dict(os.environ, {"EMBEDDING_BACKEND": "local"}):
            self.assertEqual(embeddings.backend_name(), "local")
            self.assertNotEqual(embeddings.profile().id, "gemini:gemini-embedding-001:768")
            self.assertLess(embeddings.profile().min_relevance, 0.3)  # MiniLM scale
        self.assertGreater(embeddings.profile().min_relevance, 0.4)  # Gemini scale

    def test_auto_selection_without_sentence_transformers_uses_gemini(self):
        with mock.patch.dict(os.environ, {"EMBEDDING_BACKEND": ""}), mock.patch("importlib.util.find_spec", return_value=None):
            self.assertEqual(embeddings.backend_name(), "gemini")

    def test_batches_of_100_unit_vectors_and_document_task_type(self):
        texts = [f"chunk number {i} about convolutional networks" for i in range(250)]
        vectors = embeddings.embed_documents(texts)
        self.assertEqual([len(r) for r in self.fake.embed_requests], [100, 100, 50])
        self.assertEqual(vectors.shape, (250, DIM))
        self.assertTrue(np.allclose(np.linalg.norm(vectors, axis=1), 1.0, atol=1e-5))
        first = self.fake.embed_requests[0][0]
        self.assertEqual(first["taskType"], "RETRIEVAL_DOCUMENT")
        self.assertEqual(first["outputDimensionality"], embeddings.GEMINI_DIMENSIONS)
        self.assertEqual(first["model"], "models/gemini-embedding-001")

    def test_queries_use_the_query_task_type(self):
        vec = embeddings.embed_query("what optimizer was used")
        self.assertEqual(self.fake.embed_requests[0][0]["taskType"], "RETRIEVAL_QUERY")
        self.assertAlmostEqual(float(np.linalg.norm(vec)), 1.0, places=5)

    def test_wrong_vector_count_is_a_clear_error(self):
        self.fake.short_embeddings = True
        with self.assertRaises(embeddings.EmbeddingsUnavailable) as ctx, self.assertLogs("backend.chat.embeddings", "ERROR"):
            embeddings.embed_documents(["a b c", "d e f"])
        self.assertEqual(ctx.exception.status_code, 502)

    def test_provider_errors_keep_their_status_and_are_not_retried(self):
        for code, status, message, expected_status, needle in [
            (429, "RESOURCE_EXHAUSTED", "Quota exceeded for embed_content", 429, "quota"),
            (404, "NOT_FOUND", "models/gemini-embedding-001 is not found", 503, "gemini-embedding-001"),
            (400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", 503, "api key"),
        ]:
            self.fake.embed_requests.clear()
            self.fake.embed_error = (code, {"error": {"code": code, "message": message, "status": status}})
            with self.assertRaises(embeddings.EmbeddingsUnavailable) as ctx, self.assertLogs("backend.chat.llm", "ERROR"):
                embeddings.embed_documents(["some text"])
            self.assertEqual(ctx.exception.status_code, expected_status, message)
            self.assertIn(needle, str(ctx.exception).lower())
            self.assertNotIn(KEY, str(ctx.exception))
            self.assertEqual(len(self.fake.embed_requests), 1)

    def test_missing_key_is_reported(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "", "GOOGLE_API_KEY": ""}):
            with self.assertRaises(embeddings.EmbeddingsUnavailable) as ctx:
                embeddings.embed_query("hello world")
        self.assertIn("not configured", str(ctx.exception))

    def test_switching_backend_changes_the_index_signature(self):
        path = STORAGE_DIR / "test-embeddings-sig.pdf"
        _make_pdf(path, [ABSTRACT])
        try:
            gem = paper_index._signature(path)
            with mock.patch.dict(os.environ, {"EMBEDDING_BACKEND": "local"}):
                loc = paper_index._signature(path)
            self.assertNotEqual(gem, loc)  # papers get re-indexed when the backend changes
        finally:
            path.unlink(missing_ok=True)


class TestChatOnGeminiEmbeddings(GeminiBackendCase):
    def setUp(self):
        super().setUp()
        init_db()
        seed_default_papers()
        self.dir = STORAGE_DIR / "test-embeddings-chat"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.alice = get_or_create_user("fb-emb-alice", "Alice", "alice-emb@example.com")
        self.bob = get_or_create_user("fb-emb-bob", "Bob", "bob-emb@example.com")
        self.alice_pdf, self.bob_pdf = self.dir / "a.pdf", self.dir / "b.pdf"
        _make_pdf(self.alice_pdf, [ABSTRACT, METHODS, LIMITS])
        _make_pdf(self.bob_pdf, ["Abstract\nSecret quantum error correction on superconducting qubits with surface codes."])
        for pid, title, user, path in [
            ("emb-alice", "Chest X-ray Classifier", self.alice, self.alice_pdf),
            ("emb-bob", "Bob Quantum Paper", self.bob, self.bob_pdf),
        ]:
            save_paper(
                {"id": pid, "title": title, "authors": [], "year": 2026, "category": "Uploaded", "abstract": "", "summary": "",
                 "methodology": "", "keyFindings": [], "limitations": [], "file_path": str(path)},
                [], user_id=user["id"], is_demo=False,
            )
        app.dependency_overrides[get_current_user] = lambda: self.alice
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        with get_db_connection() as conn:
            conn.execute("DELETE FROM papers WHERE id LIKE 'emb-%'")
            conn.execute("DELETE FROM users WHERE firebase_uid LIKE 'fb-emb-%'")
            conn.commit()
        shutil.rmtree(self.dir, ignore_errors=True)
        super().tearDown()

    def ask(self, question, paper_ids=("emb-alice",)):
        return self.client.post("/api/v1/chat", json={"message": question, "paper_ids": list(paper_ids)})

    def test_relevant_question_is_embedded_retrieved_and_answered(self):
        res = self.ask("What dataset and optimizer did the authors use in the experiments?")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["status"], "answered")
        self.assertEqual(body["citations"][0]["paperId"], "emb-alice")
        # Indexing happened through the embedding API, once, then the query.
        doc_tasks = {r["taskType"] for reqs in self.fake.embed_requests for r in reqs}
        self.assertEqual(doc_tasks, {"RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"})
        self.assertIn("ResNet-18", json.dumps(self.fake.generate_requests[0]))
        with get_db_connection() as conn:
            row = conn.execute("SELECT signature FROM paper_index WHERE paper_id = 'emb-alice'").fetchone()
        self.assertIn("gemini:gemini-embedding-001", row["signature"])

    def test_second_question_does_not_re_embed_the_document(self):
        self.ask("What optimizer did the authors use in the experiments?")
        doc_batches_before = sum(1 for reqs in self.fake.embed_requests if reqs[0]["taskType"] == "RETRIEVAL_DOCUMENT")
        self.ask("What dataset did the authors use in the experiments?")
        doc_batches_after = sum(1 for reqs in self.fake.embed_requests if reqs[0]["taskType"] == "RETRIEVAL_DOCUMENT")
        self.assertEqual(doc_batches_before, doc_batches_after)

    def test_topic_absent_from_the_paper_gets_insufficient_evidence_without_generation(self):
        res = self.ask("What dataset and baselines were used in the soil sample experiments?")
        self.assertEqual(res.json()["status"], "insufficient_evidence")
        self.assertEqual(self.fake.generate_requests, [])

    def test_other_users_paper_is_never_embedded_or_sent(self):
        res = self.ask("Explain the quantum error correction methodology", paper_ids=("emb-bob",))
        self.assertEqual(res.json()["status"], "no_papers")
        self.assertEqual(self.fake.embed_requests, [])
        self.assertEqual(self.fake.generate_requests, [])

    def test_embedding_quota_error_surfaces_as_429_with_a_clear_message(self):
        self.fake.embed_error = (429, {"error": {"code": 429, "message": "Quota exceeded", "status": "RESOURCE_EXHAUSTED"}})
        with self.assertLogs("backend.chat.llm", "ERROR"):
            res = self.ask("What optimizer did the authors use in the experiments?")
        self.assertEqual(res.status_code, 429)
        self.assertIn("quota", res.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
