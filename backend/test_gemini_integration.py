"""
Gemini provider tests that use the REAL google-genai SDK.

A local HTTP server stands in for Google and speaks Gemini's REST shapes, so these tests exercise
the SDK's actual request construction, response parsing and exception classes, plus the full
/api/v1/chat path with real retrieval. They do not prove the live API accepts a given model;
`python -m backend.check_gemini` does that against your key.
"""
import contextlib
import io
import json
import os
import shutil
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
from unittest import mock

import httpx
from fastapi.testclient import TestClient
from google import genai
from google.genai import errors, types

from backend import check_gemini
from backend.auth.firebase_auth import get_current_user
from backend.chat import gemini_errors as ge
from backend.chat import index as paper_index
from backend.chat import llm
from backend.db.database import get_db_connection, get_or_create_user, init_db, save_paper, seed_default_papers
from backend.main import app
from backend.routers.papers import STORAGE_DIR
from backend.test_chat import ABSTRACT, LIMITS, METHODS, _make_pdf

TEST_KEY = "AIzaSyTESTKEYTESTKEYTESTKEYTESTKEY12345"
MODEL = "gemini-test-model"


def api_error(code, status, message, reason=None):
    error = {"code": code, "message": message, "status": status}
    if reason:
        error["details"] = [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": reason}]
    cls = errors.ClientError if code < 500 else errors.ServerError
    return cls(code, {"error": error})


class TestClassification(unittest.TestCase):
    def kind(self, exc):
        return ge.classify(exc, MODEL)

    def test_model_404_names_model_and_fix(self):
        f = self.kind(api_error(404, "NOT_FOUND", f"models/{MODEL} is not found for API version v1beta, or is not supported for generateContent."))
        self.assertEqual((f.kind, f.http_status), (ge.MODEL_UNAVAILABLE, 503))
        self.assertIn(MODEL, f.message)
        self.assertIn("check_gemini", f.message)

    def test_404_without_a_model_is_not_blamed_on_the_model(self):
        f = self.kind(api_error(404, "NOT_FOUND", "Requested entity was not found."))
        self.assertEqual(f.kind, ge.ENDPOINT_NOT_FOUND)
        self.assertNotIn("check_gemini", f.message)

    def test_invalid_key_is_distinct_from_a_bad_model(self):
        for exc in [
            api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID"),
            api_error(400, "INVALID_ARGUMENT", "API key expired. Please renew the API key."),
            api_error(401, "UNAUTHENTICATED", "Request had invalid authentication credentials."),
        ]:
            self.assertEqual(self.kind(exc).kind, ge.INVALID_KEY)

    def test_permission_vs_account_billing(self):
        self.assertEqual(self.kind(api_error(403, "PERMISSION_DENIED", "Permission denied on resource.")).kind, ge.PERMISSION)
        self.assertEqual(self.kind(api_error(403, "PERMISSION_DENIED", "Generative Language API has not been used in project 123 before or it is disabled.")).kind, ge.ACCOUNT)
        self.assertEqual(self.kind(api_error(403, "PERMISSION_DENIED", "denied", "BILLING_DISABLED")).kind, ge.ACCOUNT)
        self.assertEqual(self.kind(api_error(400, "FAILED_PRECONDITION", "User location is not supported for the API use.")).kind, ge.ACCOUNT)

    def test_quota_outage_and_timeout_are_distinct(self):
        q = self.kind(api_error(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota."))
        self.assertEqual((q.kind, q.http_status), (ge.QUOTA, 429))
        o = self.kind(api_error(503, "UNAVAILABLE", "The model is overloaded."))
        self.assertEqual((o.kind, o.http_status), (ge.OUTAGE, 502))
        t = self.kind(api_error(504, "DEADLINE_EXCEEDED", "Deadline expired."))
        self.assertEqual((t.kind, t.http_status), (ge.TIMEOUT, 504))

    def test_429_with_billing_boilerplate_is_quota_not_account(self):
        text = "You exceeded your current quota, please check your plan and billing details. * Quota exceeded ... limit: 0, model: m"
        f = self.kind(api_error(429, "RESOURCE_EXHAUSTED", text))
        self.assertEqual((f.kind, f.http_status), (ge.QUOTA, 429))
        self.assertIn("no free-tier quota", f.message)

    def test_other_400s_and_system_instruction_support(self):
        self.assertEqual(self.kind(api_error(400, "INVALID_ARGUMENT", "Unknown field.")).kind, ge.BAD_REQUEST)
        f = self.kind(api_error(400, "INVALID_ARGUMENT", "Developer instruction is not enabled for models/x"))
        self.assertIn("system instruction", f.message)

    def test_network_failures(self):
        self.assertEqual(self.kind(httpx.ConnectError("dns")).kind, ge.NETWORK)
        self.assertEqual(self.kind(httpx.ReadTimeout("slow")).kind, ge.TIMEOUT)

    def test_programming_errors_are_not_blamed_on_gemini(self):
        for exc in [RuntimeError("boom"), AttributeError("x"), KeyError("k"), ValueError("v")]:
            f = self.kind(exc)
            self.assertEqual((f.kind, f.http_status), (ge.UNEXPECTED, 500))
            self.assertNotIn(MODEL, f.message)
            self.assertIn("server problem", f.message)  # says it is ours, not a key/model fault
            self.assertNotIn("invalid", f.message.lower())
            self.assertNotIn("not found", f.message.lower())

    def test_logs_never_contain_the_api_key(self):
        leaky = api_error(400, "INVALID_ARGUMENT", f"Bad request for key {TEST_KEY} here")
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": TEST_KEY}), self.assertLogs("backend.chat.llm", "ERROR") as logs:
            result = llm.to_unavailable(leaky, MODEL)
        self.assertNotIn(TEST_KEY, "\n".join(logs.output))
        self.assertNotIn(TEST_KEY, str(result))


class TestExtractText(unittest.TestCase):
    def test_blocked_prompt(self):
        response = SimpleNamespace(prompt_feedback=SimpleNamespace(block_reason="SAFETY"), candidates=[], text=None)
        with self.assertRaises(llm.LlmUnavailable) as ctx:
            llm.extract_text(response, MODEL)
        self.assertEqual((ctx.exception.kind, ctx.exception.status_code), (ge.BLOCKED, 422))

    def test_token_budget_spent_on_reasoning(self):
        response = SimpleNamespace(prompt_feedback=None, candidates=[SimpleNamespace(finish_reason="FinishReason.MAX_TOKENS")], text=None)
        with self.assertRaises(llm.LlmUnavailable) as ctx:
            llm.extract_text(response, MODEL)
        self.assertIn("output budget", str(ctx.exception))

    def test_text_is_returned(self):
        response = SimpleNamespace(prompt_feedback=None, candidates=[], text="  Hello [1]  ")
        self.assertEqual(llm.extract_text(response, MODEL), "Hello [1]")


class FakeGemini:
    """Local stand-in for generativelanguage.googleapis.com speaking Gemini's REST shapes."""

    def __init__(self):
        self.requests = []
        self.per_model = {}  # model name -> (status, payload), overriding `next` for that model
        self.next = (200, {"candidates": [{"content": {"role": "model", "parts": [{"text": "The authors used Adam [1]."}]}, "finishReason": "STOP"}]})
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):  # noqa: N802 - http.server API
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
                outer.requests.append({"path": self.path, "headers": dict(self.headers), "body": body})
                model = self.path.split("/models/")[-1].split(":")[0]
                status, payload = outer.per_model.get(model, outer.next)
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

    def set_error(self, code, status, message, reason=None):
        error = {"code": code, "message": message, "status": status}
        if reason:
            error["details"] = [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": reason}]
        self.next = (code, {"error": error})

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def point_llm_at(fake_url):
    """Make llm use a REAL SDK client aimed at the fake server, with the app's timeout/no-retry options."""
    llm._clients.clear()
    llm._clients[TEST_KEY] = genai.Client(
        api_key=TEST_KEY,
        http_options=types.HttpOptions(base_url=fake_url, timeout=5000, retry_options=types.HttpRetryOptions(attempts=1)),
    )


class TestRealSdkAgainstFakeServer(unittest.TestCase):
    def setUp(self):
        self.fake = FakeGemini()
        self.env = mock.patch.dict(os.environ, {"GEMINI_API_KEY": TEST_KEY, "GEMINI_MODEL": MODEL, "GEMINI_FALLBACK_MODEL": ""})
        self.env.start()
        point_llm_at(self.fake.url)

    def tearDown(self):
        self.env.stop()
        llm._clients.clear()
        self.fake.close()

    def test_success_builds_the_right_request_and_parses_the_answer(self):
        chunk = paper_index.Chunk("c1", "p1", "Paper One", "methodology", 2, 3, "We used the Adam optimizer.")
        answer = llm.generate_answer("What optimizer?", [chunk], [], [])
        self.assertEqual(answer, "The authors used Adam [1].")
        self.assertEqual(len(self.fake.requests), 1)
        sent = self.fake.requests[0]
        self.assertTrue(sent["path"].endswith(f"/models/{MODEL}:generateContent"), sent["path"])
        self.assertEqual(sent["headers"].get("x-goog-api-key"), TEST_KEY)
        body = json.dumps(sent["body"])
        self.assertIn("We used the Adam optimizer.", body)
        self.assertIn("system_instruction", sent["body"].keys() | {k.replace("systemInstruction", "system_instruction") for k in sent["body"]})
        self.assertNotIn(TEST_KEY, body)

    def test_each_provider_error_is_classified_and_never_retried(self):
        cases = [
            ((404, "NOT_FOUND", f"models/{MODEL} is not found for API version v1beta", None), ge.MODEL_UNAVAILABLE, 503),
            ((400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID"), ge.INVALID_KEY, 503),
            ((403, "PERMISSION_DENIED", "Permission denied.", None), ge.PERMISSION, 503),
            ((429, "RESOURCE_EXHAUSTED", "Quota exceeded.", None), ge.QUOTA, 429),
            ((503, "UNAVAILABLE", "Overloaded.", None), ge.OUTAGE, 502),
        ]
        for (code, status, message, reason), kind, http_status in cases:
            self.fake.requests.clear()
            self.fake.set_error(code, status, message, reason)
            with self.assertRaises(llm.LlmUnavailable) as ctx, self.assertLogs("backend.chat.llm", "ERROR"):
                llm.generate_answer("What optimizer?", [], [], [])
            self.assertEqual((ctx.exception.kind, ctx.exception.status_code), (kind, http_status), message)
            self.assertEqual(len(self.fake.requests), 1, f"{code} must not be retried (one billed attempt only)")

    def test_unreachable_server_is_a_network_error(self):
        self.fake.close()
        with self.assertRaises(llm.LlmUnavailable) as ctx, self.assertLogs("backend.chat.llm", "ERROR"):
            llm.generate_answer("What optimizer?", [], [], [])
        self.assertEqual(ctx.exception.kind, ge.NETWORK)
        self.fake = FakeGemini()  # so tearDown can close cleanly

    def test_empty_candidates_is_reported_not_returned_as_an_answer(self):
        self.fake.next = (200, {"candidates": [{"content": {"role": "model", "parts": []}, "finishReason": "MAX_TOKENS"}]})
        with self.assertRaises(llm.LlmUnavailable) as ctx, self.assertLogs("backend.chat.llm", "ERROR"):
            llm.generate_answer("What optimizer?", [], [], [])
        self.assertEqual(ctx.exception.kind, ge.EMPTY)
        self.assertIn("output budget", str(ctx.exception))


class TestFallbackModel(unittest.TestCase):
    FALLBACK = "gemini-fallback-model"

    def setUp(self):
        self.fake = FakeGemini()
        self.env = mock.patch.dict(os.environ, {"GEMINI_API_KEY": TEST_KEY, "GEMINI_MODEL": MODEL, "GEMINI_FALLBACK_MODEL": self.FALLBACK})
        self.env.start()
        point_llm_at(self.fake.url)

    def tearDown(self):
        self.env.stop()
        llm._clients.clear()
        self.fake.close()

    def models_called(self):
        return [r["path"].split("/models/")[-1].split(":")[0] for r in self.fake.requests]

    def overloaded(self):
        return (503, {"error": {"code": 503, "message": "overloaded", "status": "UNAVAILABLE"}})

    def test_overloaded_primary_falls_back_once_and_reports_the_model_used(self):
        self.fake.per_model[MODEL] = self.overloaded()
        with self.assertLogs("backend.chat.llm", "WARNING"):
            answer = llm.generate_answer("What optimizer?", [], [], [])
        self.assertEqual(answer, "The authors used Adam [1].")
        self.assertEqual(self.models_called(), [MODEL, self.FALLBACK])
        self.assertEqual(llm.used_model(), self.FALLBACK)

    def test_primary_success_never_touches_the_fallback(self):
        llm.generate_answer("What optimizer?", [], [], [])
        self.assertEqual(self.models_called(), [MODEL])
        self.assertEqual(llm.used_model(), MODEL)

    def test_model_unavailable_and_model_quota_also_fall_back(self):
        for status, code, text in [(404, "NOT_FOUND", f"models/{MODEL} is not found"), (429, "RESOURCE_EXHAUSTED", "Quota exceeded, limit: 0")]:
            self.fake.requests.clear()
            self.fake.per_model[MODEL] = (status, {"error": {"code": status, "message": text, "status": code}})
            with self.assertLogs("backend.chat.llm", "WARNING"):
                llm.generate_answer("What optimizer?", [], [], [])
            self.assertEqual(self.models_called(), [MODEL, self.FALLBACK], text)

    def test_both_models_failing_raises_the_primary_failure_after_exactly_two_calls(self):
        self.fake.per_model[MODEL] = self.overloaded()
        self.fake.per_model[self.FALLBACK] = self.overloaded()
        with self.assertRaises(llm.LlmUnavailable) as ctx, self.assertLogs("backend.chat.llm"):
            llm.generate_answer("What optimizer?", [], [], [])
        self.assertEqual(ctx.exception.kind, ge.OUTAGE)
        self.assertEqual(len(self.fake.requests), 2)

    def test_key_permission_and_bad_request_errors_never_fall_back(self):
        for status, code, text in [
            (400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key."),
            (403, "PERMISSION_DENIED", "Permission denied."),
            (400, "INVALID_ARGUMENT", "Unknown field."),
        ]:
            self.fake.requests.clear()
            self.fake.per_model[MODEL] = (status, {"error": {"code": status, "message": text, "status": code}})
            with self.assertRaises(llm.LlmUnavailable), self.assertLogs("backend.chat.llm", "ERROR"):
                llm.generate_answer("What optimizer?", [], [], [])
            self.assertEqual(self.models_called(), [MODEL], text)

    def test_no_fallback_configured_or_same_as_primary_means_one_call(self):
        for value in ["", MODEL]:
            self.fake.requests.clear()
            self.fake.per_model[MODEL] = self.overloaded()
            with mock.patch.dict(os.environ, {"GEMINI_FALLBACK_MODEL": value}), self.assertRaises(llm.LlmUnavailable), self.assertLogs("backend.chat.llm", "ERROR"):
                llm.generate_answer("What optimizer?", [], [], [])
            self.assertEqual(self.models_called(), [MODEL])


class TestChatEndToEndThroughRealSdk(unittest.TestCase):
    def setUp(self):
        init_db()
        seed_default_papers()
        self.dir = STORAGE_DIR / "test-gemini-e2e"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.alice = get_or_create_user("fb-gem-alice", "Alice", "alice-gem@example.com")
        self.bob = get_or_create_user("fb-gem-bob", "Bob", "bob-gem@example.com")
        self.alice_pdf, self.bob_pdf = self.dir / "alice.pdf", self.dir / "bob.pdf"
        _make_pdf(self.alice_pdf, [ABSTRACT, METHODS, LIMITS])
        _make_pdf(self.bob_pdf, ["Abstract\nSecret quantum error correction on superconducting qubits with surface codes."])
        for pid, title, user, path in [
            ("gem-alice", "Chest X-ray Pneumonia Classifier", self.alice, self.alice_pdf),
            ("gem-bob", "Bob Quantum Paper", self.bob, self.bob_pdf),
        ]:
            save_paper(
                {"id": pid, "title": title, "authors": [], "year": 2026, "category": "Uploaded", "abstract": "", "summary": "",
                 "methodology": "", "keyFindings": [], "limitations": [], "file_path": str(path)},
                [], user_id=user["id"], is_demo=False,
            )
        self.fake = FakeGemini()
        self.env = mock.patch.dict(os.environ, {"GEMINI_API_KEY": TEST_KEY, "GEMINI_MODEL": MODEL, "GEMINI_FALLBACK_MODEL": ""})
        self.env.start()
        point_llm_at(self.fake.url)
        app.dependency_overrides[get_current_user] = lambda: self.alice
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.env.stop()
        llm._clients.clear()
        self.fake.close()
        with get_db_connection() as conn:
            conn.execute("DELETE FROM papers WHERE id LIKE 'gem-%'")
            conn.execute("DELETE FROM users WHERE firebase_uid LIKE 'fb-gem-%'")
            conn.commit()
        shutil.rmtree(self.dir, ignore_errors=True)

    def ask(self, q="What dataset and optimizer did the authors use in the experiments?"):
        return self.client.post("/api/v1/chat", json={"message": q, "paper_ids": ["gem-alice"]})

    def test_relevant_question_reaches_gemini_with_real_excerpts_and_returns_mapped_citations(self):
        res = self.ask()
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        # Schema the frontend (ChatReply) expects.
        self.assertEqual(set(body), {"category", "status", "answer", "citations", "evidence", "model"})
        self.assertEqual(body["status"], "answered")
        self.assertEqual(body["answer"], "The authors used Adam [1].")
        self.assertEqual(body["model"], MODEL)
        self.assertEqual(set(body["evidence"]), {"papersSearched", "papersUnavailable", "paperSetTruncated"})
        # Exactly one provider request, containing the real excerpt text and nothing from Bob's paper.
        self.assertEqual(len(self.fake.requests), 1)
        sent = json.dumps(self.fake.requests[0]["body"])
        self.assertIn("ResNet-18", sent)
        self.assertNotIn("quantum error correction", sent.lower())
        # Citation [1] maps to a real stored chunk of Alice's paper, with pages and sections preserved.
        self.assertEqual(len(body["citations"]), 1)
        cit = body["citations"][0]
        self.assertEqual(set(cit), {"ref", "paperId", "paperTitle", "section", "pageStart", "pageEnd", "chunkId", "excerpt"})
        self.assertEqual((cit["ref"], cit["paperId"]), (1, "gem-alice"))
        self.assertTrue(1 <= cit["pageStart"] <= cit["pageEnd"] <= 3)
        with get_db_connection() as conn:
            row = conn.execute("SELECT text, page_start, page_end FROM paper_chunks WHERE id = ? AND paper_id = 'gem-alice'", (cit["chunkId"],)).fetchone()
        self.assertIsNotNone(row)
        self.assertTrue(row["text"].startswith(cit["excerpt"].rstrip("…")[:60]))
        self.assertEqual((row["page_start"], row["page_end"]), (cit["pageStart"], cit["pageEnd"]))

    def test_provider_failures_surface_as_specific_http_errors(self):
        cases = [
            ((404, "NOT_FOUND", f"models/{MODEL} is not found for API version v1beta", None), 503, MODEL),
            ((400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID"), 503, "API key"),
            ((429, "RESOURCE_EXHAUSTED", "Quota exceeded.", None), 429, "quota"),
        ]
        for (code, status, message, reason), http_status, needle in cases:
            self.fake.set_error(code, status, message, reason)
            with self.assertLogs("backend.chat.llm", "ERROR"):
                res = self.ask()
            self.assertEqual(res.status_code, http_status, message)
            detail = res.json()["detail"]
            self.assertIn(needle.lower(), detail.lower(), message)
            self.assertNotIn(TEST_KEY, res.text)
            self.assertNotIn("Traceback", res.text)
            self.assertNotIn("ResNet", res.text)  # no paper content leaks into error text

    def test_out_of_scope_never_calls_gemini(self):
        self.assertEqual(self.ask("Tell me a joke").json()["status"], "refused")
        self.assertEqual(len(self.fake.requests), 0)


class FakeModels:
    def __init__(self, listing, behaviour):
        self._listing, self._behaviour = listing, behaviour
        self.generated = []

    def list(self):
        if isinstance(self._listing, Exception):
            raise self._listing
        return [SimpleNamespace(name=f"models/{n}", supported_actions=["generateContent"]) for n in self._listing]

    def generate_content(self, model, contents, config):
        self.generated.append(model)
        result = self._behaviour.get(model)
        if isinstance(result, Exception):
            raise result
        return SimpleNamespace(text=result or "ok", candidates=[], prompt_feedback=None)


class TestCheckGeminiScript(unittest.TestCase):
    def run_script(self, listing, behaviour, argv=None, key=TEST_KEY, model=MODEL):
        fake = SimpleNamespace(models=FakeModels(listing, behaviour))
        env = {"GEMINI_MODEL": model}
        if key:
            env["GEMINI_API_KEY"] = key
        out = io.StringIO()
        with mock.patch.dict(os.environ, env), mock.patch.object(llm, "_api_key", return_value=key), contextlib.redirect_stdout(out), \
                mock.patch.object(llm, "model_name", return_value=model):
            code = check_gemini.run(argv or [], client=fake)
        return code, out.getvalue(), fake.models

    def test_listed_but_not_generating_is_flagged_and_a_working_model_is_recommended(self):
        listing = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.5-pro"]
        behaviour = {
            "gemini-2.5-flash": api_error(404, "NOT_FOUND", "models/gemini-2.5-flash is no longer available to new users."),
            "gemini-3.5-flash": "ok",
        }
        code, out, models = self.run_script(listing, behaviour, model="gemini-2.5-flash")
        self.assertEqual(code, 0, out)
        self.assertIn("is listed. That alone proves nothing", out)
        self.assertIn("FAIL  gemini-2.5-flash: model_unavailable", out)
        self.assertIn('$env:GEMINI_MODEL = "gemini-3.5-flash"', out)
        self.assertNotIn(TEST_KEY, out)
        self.assertEqual(models.generated[:2], ["gemini-2.5-flash", "gemini-3.5-flash"])  # newest stable tried next

    def test_working_configured_model_needs_no_change_and_no_extra_probes(self):
        code, out, models = self.run_script(["gemini-3.5-flash"], {"gemini-3.5-flash": "ok"}, model="gemini-3.5-flash")
        self.assertEqual(code, 0)
        self.assertIn("works for this key. No change needed", out)
        self.assertEqual(models.generated, ["gemini-3.5-flash"])

    def test_invalid_key_stops_immediately_and_is_not_called_a_model_problem(self):
        bad = api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID")
        code, out, models = self.run_script(bad, {"gemini-2.5-flash": bad}, model="gemini-2.5-flash")
        self.assertEqual(code, 1)
        self.assertIn("invalid_key", out)
        self.assertNotIn("model_unavailable", out)
        self.assertEqual(models.generated, [])

    def test_quota_failure_on_one_model_does_not_end_the_search(self):
        quota = api_error(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota, please check your plan and billing details. limit: 0, model: gemini-3.9-flash")
        behaviour = {
            "gemini-2.5-flash": api_error(404, "NOT_FOUND", "models/gemini-2.5-flash is no longer available"),
            "gemini-3.9-flash": quota,
            "gemini-3.5-flash": "ok",
        }
        code, out, models = self.run_script(["gemini-3.9-flash", "gemini-3.5-flash"], behaviour, model="gemini-2.5-flash")
        self.assertEqual(code, 0, out)
        self.assertIn('$env:GEMINI_MODEL = "gemini-3.5-flash"', out)
        self.assertNotIn("account_or_billing", out)

    def test_repeated_quota_failures_eventually_stop_the_search(self):
        quota = api_error(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota, please check your plan and billing details.")
        names = [f"gemini-3.{i}-flash" for i in range(9, 4, -1)]
        behaviour = {n: quota for n in names}
        behaviour["gemini-2.5-flash"] = quota
        code, out, models = self.run_script(names, behaviour, model="gemini-2.5-flash")
        self.assertEqual(code, 1)
        self.assertIn("quota limits", out)
        self.assertLessEqual(len(models.generated), 4)

    def test_missing_key(self):
        code, out, _ = self.run_script([], {}, key=None)
        self.assertEqual(code, 1)
        self.assertIn("not set", out)

    def test_candidate_ranking_prefers_stable_newest_flash_and_demotes_codenames(self):
        names = ["gemini-4-argon", "gemini-2.5-pro", "gemini-3.5-flash-preview-09-2026", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-3.8-flash"]
        ranked = sorted(names, key=check_gemini.candidate_rank)
        self.assertEqual(ranked[0], "gemini-3.8-flash")
        self.assertLess(ranked.index("gemini-2.5-pro"), ranked.index("gemini-4-argon"))
        self.assertEqual(ranked[-1], "gemini-3.5-flash-preview-09-2026")

    def test_non_text_models_are_not_candidates(self):
        listing = ["gemini-3.5-transcribe", "gemini-omni-1.1-flash", "gemini-nano-banana-2.1", "gemini-3.5-flash"]
        fake = SimpleNamespace(models=FakeModels(listing, {}))
        self.assertEqual(check_gemini.list_candidates(fake), ["gemini-3.5-flash"])


if __name__ == "__main__":
    unittest.main()
