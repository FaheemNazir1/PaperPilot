import shutil
import unittest
from pathlib import Path

import pymupdf
from fastapi.testclient import TestClient

from backend.auth.firebase_auth import get_current_user
from backend.db.database import get_db_connection, get_or_create_user, init_db, save_paper, seed_default_papers
from backend.main import app
from backend.routers.papers import STORAGE_DIR


class TestPdfRetrieval(unittest.TestCase):
    def setUp(self):
        init_db()
        seed_default_papers()
        self.dir = STORAGE_DIR / "test-pdf-view"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.alice = get_or_create_user("fb-pdf-alice", "Alice", "alice-pdf@example.com")
        self.bob = get_or_create_user("fb-pdf-bob", "Bob", "bob-pdf@example.com")
        self.real = self.dir / "real.pdf"
        doc = pymupdf.open()
        doc.new_page().insert_text((72, 72), "private paper")
        doc.save(str(self.real))
        doc.close()
        self.outside = Path(__file__).resolve()  # exists, but is not inside the uploads folder
        self._add("pdf-ok", self.alice["id"], self.real)
        self._add("pdf-gone", self.alice["id"], self.dir / "gone.pdf")
        self._add("pdf-outside", self.alice["id"], self.outside)
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
            conn.execute("DELETE FROM papers WHERE id LIKE 'pdf-%'")
            conn.execute("DELETE FROM users WHERE firebase_uid LIKE 'fb-pdf-%'")
            conn.commit()
        shutil.rmtree(self.dir, ignore_errors=True)

    def _as(self, user):
        app.dependency_overrides[get_current_user] = lambda: user

    def test_requires_authentication(self):
        self.assertEqual(self.client.get("/api/v1/papers/pdf-ok/pdf").status_code, 401)

    def test_owner_gets_real_pdf(self):
        self._as(self.alice)
        res = self.client.get("/api/v1/papers/pdf-ok/pdf")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF-"))
        self.assertEqual(res.content, self.real.read_bytes())
        self.assertNotIn(str(self.dir), str(res.headers))

    def test_other_user_gets_404(self):
        self._as(self.bob)
        self.assertEqual(self.client.get("/api/v1/papers/pdf-ok/pdf").status_code, 404)

    def test_demo_paper_gets_404(self):
        self._as(self.alice)
        self.assertEqual(self.client.get("/api/v1/papers/paper-01/pdf").status_code, 404)

    def test_missing_file_is_404_without_path_leak(self):
        self._as(self.alice)
        res = self.client.get("/api/v1/papers/pdf-gone/pdf")
        self.assertEqual(res.status_code, 404)
        self.assertNotIn("gone.pdf", res.text)

    def test_file_outside_uploads_folder_is_never_served(self):
        self._as(self.alice)
        self.assertEqual(self.client.get("/api/v1/papers/pdf-outside/pdf").status_code, 404)


if __name__ == "__main__":
    unittest.main()
