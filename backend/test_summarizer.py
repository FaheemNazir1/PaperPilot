import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import pymupdf
from fastapi.testclient import TestClient

from backend.auth.firebase_auth import get_current_user
from backend.db.database import get_db_connection, get_or_create_user, init_db, save_paper, seed_default_papers
from backend.main import app
from backend.services import summarizer

SAMPLE_TEXT = (
    "Deep learning methods have improved automatic summarization of scientific articles. "
    "In this paper we study transformer models fine-tuned on arXiv papers and evaluate them "
    "with ROUGE. We find that small models capture the main topic but miss fine detail. "
) * 6


def _make_pdf(path: Path, text: str) -> None:
    doc = pymupdf.open()
    page = doc.new_page()
    if text:
        page.insert_textbox(pymupdf.Rect(40, 40, 550, 800), text, fontsize=10)
    doc.save(str(path))
    doc.close()


class TestSummarizerRoute(unittest.TestCase):
    def setUp(self):
        init_db()
        seed_default_papers()
        self.tmp = Path(tempfile.mkdtemp())
        self.alice = get_or_create_user("fb-sum-alice", "Alice", "alice-sum@example.com")
        self.bob = get_or_create_user("fb-sum-bob", "Bob", "bob-sum@example.com")
        self.text_pdf = self.tmp / "text.pdf"
        self.blank_pdf = self.tmp / "blank.pdf"
        _make_pdf(self.text_pdf, SAMPLE_TEXT)
        _make_pdf(self.blank_pdf, "")
        self._add("sum-text", self.alice["id"], self.text_pdf)
        self._add("sum-blank", self.alice["id"], self.blank_pdf)
        self._add("sum-nofile", self.alice["id"], self.tmp / "missing.pdf")
        self.client = TestClient(app)

    def _add(self, paper_id, user_id, path):
        save_paper(
            {"id": paper_id, "title": paper_id, "authors": [], "year": 2026, "category": "Uploaded",
             "abstract": "", "summary": "", "methodology": "", "keyFindings": [], "limitations": [],
             "file_path": str(path)},
            [], user_id=user_id, is_demo=False,
        )

    def tearDown(self):
        app.dependency_overrides.clear()
        with get_db_connection() as conn:
            conn.execute("DELETE FROM papers WHERE id LIKE 'sum-%'")
            conn.execute("DELETE FROM users WHERE firebase_uid LIKE 'fb-sum-%'")
            conn.commit()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _as(self, user):
        app.dependency_overrides[get_current_user] = lambda: user

    def test_requires_authentication(self):
        res = self.client.post("/api/v1/papers/sum-text/summary")
        self.assertEqual(res.status_code, 401)

    def test_other_users_paper_is_404(self):
        self._as(self.bob)
        self.assertEqual(self.client.post("/api/v1/papers/sum-text/summary").status_code, 404)

    def test_demo_paper_is_404(self):
        self._as(self.alice)
        self.assertEqual(self.client.post("/api/v1/papers/paper-01/summary").status_code, 404)

    def test_missing_stored_file_is_404(self):
        self._as(self.alice)
        self.assertEqual(self.client.post("/api/v1/papers/sum-nofile/summary").status_code, 404)

    def test_model_not_installed_is_503_without_leaking_paths(self):
        self._as(self.alice)
        with mock.patch.object(summarizer, "is_configured", return_value=False), \
             mock.patch.dict(summarizer._state, {"model": None}):
            res = self.client.post("/api/v1/papers/sum-text/summary")
        self.assertEqual(res.status_code, 503)
        self.assertNotIn("models", res.json()["detail"].lower().replace("summarizer model", ""))

    def test_pdf_without_text_is_422(self):
        self._as(self.alice)
        res = self.client.post("/api/v1/papers/sum-blank/summary")
        self.assertEqual(res.status_code, 422)

    @unittest.skipUnless(summarizer.is_configured(), "model files not present")
    def test_real_model_generates_summary(self):
        self._as(self.alice)
        res = self.client.post("/api/v1/papers/sum-text/summary")
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertTrue(body["summary"].strip())
        self.assertEqual(body["model"], "Fine-tuned T5-small")
        self.assertLessEqual(body["inputTokens"], 512)
        self.assertIn("truncated", body)


if __name__ == "__main__":
    unittest.main()
