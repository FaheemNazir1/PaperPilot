"""
Tests for:
  - POST /api/v1/papers/{id}/analyze  (PDF extraction endpoint)
  - PATCH /api/v1/papers/{id}/abstract (abstract update)
  - Output quality checker
  - Analyze endpoint called with paper IDs in review

All tests use mocked file I/O and services — no real PDF or model required.
"""

from __future__ import annotations

import io
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import pymupdf
from fastapi.testclient import TestClient

import backend.db.database as database
import backend.routers.papers as papers_module
from backend.auth.firebase_auth import get_current_user, get_optional_current_user
from backend.main import app
from backend.services.output_checker import check_output_quality


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pdf(text: str = "Abstract\nThis paper proposes a new approach.", pages: int = 2) -> bytes:
    doc = pymupdf.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"{text} Page {i + 1}")
    doc.set_metadata({"title": "Test Paper Title", "author": "Ada Lovelace"})
    data = doc.tobytes()
    doc.close()
    return data


_MOCK_USER = {
    "id": 1,
    "firebase_uid": "test-uid",
    "name": "Test User",
    "email": "test@example.com",
}

_RICH_TEXT = (
    "Abstract\n"
    "This paper proposes a novel approach to sequence modeling using attention mechanisms. "
    "We evaluate on WMT 2014 and achieve state-of-the-art BLEU scores.\n\n"
    "Introduction\n"
    "Recurrent neural networks have dominated sequence transduction tasks. "
    "However, they suffer from long-range dependency issues.\n\n"
    "Methods\n"
    "We introduce multi-head self-attention with positional encodings.\n\n"
    "Results\n"
    "Our model achieves 28.4 BLEU on EN-DE translation.\n\n"
    "Conclusion\n"
    "The Transformer architecture outperforms all prior recurrent models."
)


# ---------------------------------------------------------------------------
# Base test case with temp DB and storage
# ---------------------------------------------------------------------------

class AnalyzeTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="paperpilot-analyze-test-"))
        self._orig_db = database.DB_PATH
        self._orig_storage = papers_module.STORAGE_DIR
        database.DB_PATH = self.tmp / "test.db"
        papers_module.STORAGE_DIR = self.tmp / "uploads"
        papers_module.STORAGE_DIR.mkdir()

        database.init_db()
        database.seed_default_papers()

        self.user = database.get_or_create_user("uid-test", "Test User", "test@example.com")
        self.client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: self.user
        app.dependency_overrides[get_optional_current_user] = lambda: self.user

    def tearDown(self):
        app.dependency_overrides.clear()
        database.DB_PATH = self._orig_db
        papers_module.STORAGE_DIR = self._orig_storage
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _upload_pdf(self, name: str = "paper.pdf", data: bytes | None = None) -> dict:
        data = _make_pdf(_RICH_TEXT) if data is None else data
        res = self.client.post(
            "/api/v1/papers/upload",
            files=[("files", (name, data, "application/pdf"))],
        )
        self.assertEqual(res.status_code, 200)
        return res.json()["papers"][0]


# ---------------------------------------------------------------------------
# Analyze endpoint tests
# ---------------------------------------------------------------------------

class TestAnalyzeEndpoint(AnalyzeTestCase):
    def test_analyze_extracts_abstract(self):
        """Analyze extracts text and returns a non-empty abstract."""
        paper = self._upload_pdf()
        res = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["paper_id"], paper["id"])
        self.assertGreater(len(data["abstract"]), 30)
        self.assertEqual(data["status"], "Indexed")

    def test_analyze_updates_paper_status(self):
        """After analysis the paper status should be Indexed, not Uploaded."""
        paper = self._upload_pdf()
        self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        updated = self.client.get(f"/api/v1/papers/{paper['id']}").json()
        self.assertEqual(updated["status"], "Indexed")
        self.assertGreater(len(updated["abstract"]), 20)

    def test_analyze_requires_auth(self):
        """Unauthenticated request must be rejected."""
        app.dependency_overrides.clear()
        paper_id = "paper-does-not-matter"
        res = self.client.post(f"/api/v1/papers/{paper_id}/analyze")
        self.assertIn(res.status_code, (401, 403))

    def test_analyze_nonexistent_paper_returns_404(self):
        """Analyzing a paper that doesn't exist returns 404."""
        res = self.client.post("/api/v1/papers/nonexistent-id/analyze")
        self.assertEqual(res.status_code, 404)

    def test_analyze_cross_user_returns_404(self):
        """User A cannot analyze user B's paper."""
        paper = self._upload_pdf()

        other_user = database.get_or_create_user("uid-other", "Other", "other@example.com")
        app.dependency_overrides[get_current_user] = lambda: other_user
        app.dependency_overrides[get_optional_current_user] = lambda: other_user

        res = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        self.assertEqual(res.status_code, 404)

    def test_analyze_image_only_pdf_returns_422(self):
        """A PDF with no extractable text returns 422 with a clear message."""
        doc = pymupdf.open()
        doc.new_page()  # blank page, no text
        blank_pdf = doc.tobytes()
        doc.close()

        paper = self._upload_pdf(data=blank_pdf)
        res = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        self.assertEqual(res.status_code, 422)
        self.assertIn("scanned", res.json()["detail"].lower())

    def test_analyze_missing_file_returns_422(self):
        """If the PDF file is gone from disk after upload, returns 422."""
        paper = self._upload_pdf()
        # Remove the file from disk
        from backend.db.database import get_owned_file_path
        file_path = get_owned_file_path(paper["id"], self.user["id"])
        Path(file_path).unlink(missing_ok=True)

        res = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        self.assertEqual(res.status_code, 422)

    def test_analyze_idempotent(self):
        """Calling analyze twice on the same paper is safe."""
        paper = self._upload_pdf()
        r1 = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        r2 = self.client.post(f"/api/v1/papers/{paper['id']}/analyze")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)


# ---------------------------------------------------------------------------
# Abstract update tests
# ---------------------------------------------------------------------------

class TestUpdateAbstract(AnalyzeTestCase):
    def test_patch_abstract_updates_stored_value(self):
        paper = self._upload_pdf()
        self.client.post(f"/api/v1/papers/{paper['id']}/analyze")

        new_abstract = "This is a manually corrected abstract that is longer than thirty chars."
        res = self.client.patch(
            f"/api/v1/papers/{paper['id']}/abstract",
            json={"abstract": new_abstract},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["abstract"], new_abstract)

        fetched = self.client.get(f"/api/v1/papers/{paper['id']}").json()
        self.assertEqual(fetched["abstract"], new_abstract)

    def test_patch_abstract_too_short_returns_422(self):
        paper = self._upload_pdf()
        res = self.client.patch(
            f"/api/v1/papers/{paper['id']}/abstract",
            json={"abstract": "Short."},
        )
        self.assertEqual(res.status_code, 422)

    def test_patch_abstract_requires_auth(self):
        app.dependency_overrides.clear()
        res = self.client.patch("/api/v1/papers/any-id/abstract", json={"abstract": "x" * 40})
        self.assertIn(res.status_code, (401, 403))


# ---------------------------------------------------------------------------
# Output quality checker unit tests
# ---------------------------------------------------------------------------

class TestOutputChecker(unittest.TestCase):
    def test_clean_output_has_no_flags(self):
        text = (
            "Attention mechanisms have been applied to a wide range of NLP tasks. "
            "The Transformer architecture introduced multi-head self-attention. "
            "Subsequent work applied pre-training to create models such as BERT. "
            "Retrieval-augmented methods improve factual grounding. "
            "These approaches form the foundation of modern language model research."
        )
        result = check_output_quality(text, num_reference_papers=3)
        self.assertFalse(result["repeated_phrases"])
        self.assertFalse(result["citation_spam"])
        self.assertFalse(result["unsupported_citations"])
        self.assertFalse(result["truncated"])
        self.assertEqual(result["warnings"], [])

    def test_detects_repetition(self):
        sentence = "The attention mechanism has been widely used in natural language processing tasks."
        text = " ".join([sentence] * 8)
        result = check_output_quality(text)
        self.assertTrue(result["repeated_phrases"])
        self.assertTrue(len(result["warnings"]) > 0)

    def test_detects_citation_spam(self):
        text = "Prior work [1][2][3][4][5][6][7][8][9] has addressed this problem extensively."
        result = check_output_quality(text, citation_spam_threshold=8)
        self.assertTrue(result["citation_spam"])

    def test_detects_unsupported_citations(self):
        text = "As shown in [1], [2], and [7], performance improves significantly."
        result = check_output_quality(text, num_reference_papers=3)
        self.assertTrue(result["unsupported_citations"])
        self.assertTrue(any("7" in w for w in result["warnings"]))

    def test_no_unsupported_if_within_range(self):
        text = "Work by [1] and [2] establishes the baseline approach."
        result = check_output_quality(text, num_reference_papers=3)
        self.assertFalse(result["unsupported_citations"])

    def test_detects_truncation(self):
        text = "The model achieves strong performance on benchmark datasets and shows that"
        result = check_output_quality(text)
        self.assertTrue(result["truncated"])

    def test_no_truncation_for_proper_ending(self):
        text = "The model achieves strong performance on benchmark datasets."
        result = check_output_quality(text)
        self.assertFalse(result["truncated"])

    def test_empty_text_does_not_crash(self):
        result = check_output_quality("")
        self.assertIsInstance(result, dict)

    def test_zero_reference_papers_skips_citation_check(self):
        text = "See [5] for details."
        result = check_output_quality(text, num_reference_papers=0)
        self.assertFalse(result["unsupported_citations"])


if __name__ == "__main__":
    unittest.main()
