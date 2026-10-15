"""
Personal-library / demo-library separation and upload behaviour.

Runs against a throw-away SQLite file and upload directory, so it never touches
backend/paperpilot.db or backend/storage/uploads.

    python -m unittest backend.test_personal_library -v
"""
import shutil
import tempfile
import unittest
from pathlib import Path

import pymupdf
from fastapi.testclient import TestClient

import backend.db.database as database
import backend.routers.papers as papers_router
from backend.auth.firebase_auth import get_current_user, get_optional_current_user
from backend.main import app


def make_pdf(title: str = "Test Paper", pages: int = 2) -> bytes:
    doc = pymupdf.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"{title} - page {i + 1}")
    doc.set_metadata({"title": title, "author": "Ada Lovelace; Alan Turing"})
    data = doc.tobytes()
    doc.close()
    return data


class LibraryTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="paperpilot-test-"))
        self._orig_db = database.DB_PATH
        self._orig_storage = papers_router.STORAGE_DIR
        database.DB_PATH = self.tmp / "test.db"
        papers_router.STORAGE_DIR = self.tmp / "uploads"
        papers_router.STORAGE_DIR.mkdir()

        database.init_db()
        database.seed_default_papers()

        with database.get_db_connection() as conn:
            self.demo_count = conn.execute("SELECT COUNT(*) FROM papers WHERE is_demo = 1").fetchone()[0]
        self.assertGreater(self.demo_count, 0, "seeding should provide demo papers")

        self.alice = database.get_or_create_user("uid-alice", "Alice", "alice@example.com")
        self.bob = database.get_or_create_user("uid-bob", "Bob", "bob@example.com")
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        database.DB_PATH = self._orig_db
        papers_router.STORAGE_DIR = self._orig_storage
        shutil.rmtree(self.tmp, ignore_errors=True)

    def as_user(self, user):
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_optional_current_user] = lambda: user

    def upload(self, name="paper.pdf", data=None, content_type="application/pdf"):
        data = make_pdf() if data is None else data
        return self.client.post("/api/v1/papers/upload", files=[("files", (name, data, content_type))])


class TestPersonalVsDemoCounts(LibraryTestCase):
    def test_new_user_sees_zero_personal_papers(self):
        carol = database.get_or_create_user("uid-carol", "Carol", "carol@example.com")
        self.as_user(carol)

        self.assertEqual(self.client.get("/api/v1/papers").json(), [])
        stats = self.client.get("/api/v1/stats").json()
        self.assertEqual(stats["personalPapers"], 0)

    def test_demo_papers_do_not_affect_personal_count(self):
        self.as_user(self.alice)
        before = self.client.get("/api/v1/stats").json()
        self.assertEqual(before["personalPapers"], 0)
        self.assertEqual(before["demoPapers"], self.demo_count)

        self.assertEqual(self.upload().status_code, 200)

        after = self.client.get("/api/v1/stats").json()
        self.assertEqual(after["personalPapers"], 1)
        self.assertEqual(after["demoPapers"], self.demo_count)

    def test_unauthenticated_stats_have_no_personal_papers(self):
        stats = self.client.get("/api/v1/stats").json()
        self.assertEqual(stats["personalPapers"], 0)
        self.assertEqual(stats["demoPapers"], self.demo_count)

    def test_demo_papers_not_returned_as_personal_uploads(self):
        self.as_user(self.alice)
        self.upload()

        personal = self.client.get("/api/v1/papers").json()
        self.assertEqual(len(personal), 1)
        self.assertTrue(all(not p["is_demo"] for p in personal))
        self.assertFalse(any(p["id"].startswith("paper-0") for p in personal))

        with_demo = self.client.get("/api/v1/papers?include_demo=true").json()
        self.assertEqual(len(with_demo), 1 + self.demo_count)
        self.assertEqual(sum(1 for p in with_demo if p["is_demo"]), self.demo_count)

    def test_user_a_cannot_see_user_b_papers(self):
        self.as_user(self.alice)
        paper_id = self.upload("alice.pdf").json()["items"][0]["paperId"]

        self.as_user(self.bob)
        self.assertEqual(self.client.get("/api/v1/papers").json(), [])
        self.assertEqual(self.client.get(f"/api/v1/papers/{paper_id}").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/stats").json()["personalPapers"], 0)

    def test_stats_match_database_rows(self):
        self.as_user(self.alice)
        self.upload("one.pdf")
        self.upload("two.pdf")
        self.as_user(self.bob)
        self.upload("three.pdf")

        for user, expected in ((self.alice, 2), (self.bob, 1)):
            self.as_user(user)
            with database.get_db_connection() as conn:
                db_count = conn.execute(
                    "SELECT COUNT(*) FROM papers WHERE user_id = ? AND is_demo = 0", (user["id"],)
                ).fetchone()[0]
            self.assertEqual(db_count, expected)
            self.assertEqual(self.client.get("/api/v1/stats").json()["personalPapers"], db_count)
            self.assertEqual(len(self.client.get("/api/v1/papers").json()), db_count)

    def test_demo_papers_cannot_be_deleted(self):
        self.as_user(self.alice)
        self.assertEqual(self.client.delete("/api/v1/papers/paper-01").status_code, 404)


class TestUpload(LibraryTestCase):
    def test_upload_stores_file_and_record_without_analysis(self):
        self.as_user(self.alice)
        res = self.upload("My Paper.pdf", make_pdf("Quantum Things", pages=3))
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])

        item = body["items"][0]
        self.assertEqual(item["status"], "uploaded")
        self.assertEqual(item["pages"], 3)

        paper = body["papers"][0]
        self.assertEqual(paper["status"], "Uploaded")
        self.assertEqual(paper["title"], "Quantum Things")
        self.assertEqual(paper["originalFilename"], "My Paper.pdf")
        self.assertEqual(paper["userId"], self.alice["id"])
        self.assertFalse(paper["is_demo"])
        self.assertTrue(paper["uploadedAt"])
        self.assertGreater(paper["sizeBytes"], 0)
        # Nothing was analysed or extracted
        self.assertEqual(paper["original_text"], "")
        self.assertEqual(paper["cleaned_text"], "")
        self.assertEqual(paper["keyFindings"], [])
        self.assertEqual(self.client.get(f"/api/v1/papers/{paper['id']}/sections").json(), [])

        stored = list((papers_router.STORAGE_DIR / str(self.alice["id"])).glob("*.pdf"))
        self.assertEqual(len(stored), 1)

    def test_uploaded_paper_persists_and_is_listed(self):
        self.as_user(self.alice)
        paper_id = self.upload().json()["items"][0]["paperId"]
        listed = [p["id"] for p in self.client.get("/api/v1/papers").json()]
        self.assertEqual(listed, [paper_id])

    def test_owner_comes_from_token_not_request(self):
        self.as_user(self.alice)
        res = self.client.post(
            "/api/v1/papers/upload?user_id=%d" % self.bob["id"],
            files=[("files", ("a.pdf", make_pdf(), "application/pdf"))],
            data={"user_id": str(self.bob["id"])},
        )
        self.assertEqual(res.json()["papers"][0]["userId"], self.alice["id"])

    def test_requires_authentication(self):
        res = self.client.post("/api/v1/papers/upload", files=[("files", ("a.pdf", make_pdf(), "application/pdf"))])
        self.assertIn(res.status_code, (401, 403))

    def test_rejects_non_pdf_extension(self):
        self.as_user(self.alice)
        body = self.upload("notes.txt", b"hello", "text/plain").json()
        self.assertFalse(body["success"])
        self.assertEqual(body["items"][0]["status"], "error")
        self.assertEqual(body["papers"], [])

    def test_rejects_fake_pdf_content(self):
        self.as_user(self.alice)
        body = self.upload("fake.pdf", b"this is not a pdf at all").json()
        self.assertFalse(body["success"])
        self.assertIn("not a valid PDF", body["items"][0]["error"])
        self.assertEqual(self.client.get("/api/v1/stats").json()["personalPapers"], 0)
        self.assertEqual(list((papers_router.STORAGE_DIR / str(self.alice["id"])).glob("*")), [])

    def test_rejects_corrupt_pdf(self):
        self.as_user(self.alice)
        body = self.upload("broken.pdf", b"%PDF-1.4\nthis is truncated garbage").json()
        self.assertFalse(body["success"])
        self.assertEqual(body["papers"], [])
        self.assertEqual(list((papers_router.STORAGE_DIR / str(self.alice["id"])).glob("*")), [])

    def test_enforces_size_limit(self):
        self.as_user(self.alice)
        original = papers_router.MAX_UPLOAD_BYTES
        papers_router.MAX_UPLOAD_BYTES = 1024
        try:
            body = self.upload("big.pdf", make_pdf() + b"0" * 4096).json()
        finally:
            papers_router.MAX_UPLOAD_BYTES = original
        self.assertFalse(body["success"])
        self.assertIn("limit", body["items"][0]["error"])
        self.assertEqual(list((papers_router.STORAGE_DIR / str(self.alice["id"])).glob("*")), [])

    def test_mixed_batch_reports_each_file(self):
        self.as_user(self.alice)
        res = self.client.post(
            "/api/v1/papers/upload",
            files=[
                ("files", ("good.pdf", make_pdf(), "application/pdf")),
                ("files", ("bad.pdf", b"nope", "application/pdf")),
            ],
        )
        body = res.json()
        self.assertEqual([i["status"] for i in body["items"]], ["uploaded", "error"])
        self.assertEqual(len(body["papers"]), 1)

    def test_path_traversal_filename_is_neutralised(self):
        self.as_user(self.alice)
        body = self.upload("../../evil.pdf").json()
        self.assertTrue(body["success"])
        self.assertEqual(body["papers"][0]["originalFilename"], "evil.pdf")
        for f in self.tmp.rglob("evil*"):
            self.assertEqual(f.parent, papers_router.STORAGE_DIR / str(self.alice["id"]))

    def test_delete_removes_record_and_file(self):
        self.as_user(self.alice)
        paper_id = self.upload().json()["items"][0]["paperId"]
        user_dir = papers_router.STORAGE_DIR / str(self.alice["id"])
        self.assertEqual(len(list(user_dir.glob("*.pdf"))), 1)

        self.as_user(self.bob)
        self.assertEqual(self.client.delete(f"/api/v1/papers/{paper_id}").status_code, 404)
        self.assertEqual(len(list(user_dir.glob("*.pdf"))), 1)

        self.as_user(self.alice)
        self.assertEqual(self.client.delete(f"/api/v1/papers/{paper_id}").status_code, 200)
        self.assertEqual(list(user_dir.glob("*.pdf")), [])
        self.assertEqual(self.client.get("/api/v1/stats").json()["personalPapers"], 0)


class TestMigration(unittest.TestCase):
    def test_init_db_adds_upload_columns_to_existing_database(self):
        tmp = Path(tempfile.mkdtemp(prefix="paperpilot-mig-"))
        orig = database.DB_PATH
        try:
            database.DB_PATH = tmp / "old.db"
            import sqlite3

            conn = sqlite3.connect(str(database.DB_PATH))
            # Papers table as shipped before the upload columns existed
            conn.execute(
                """CREATE TABLE papers (
                    id TEXT PRIMARY KEY, user_id INTEGER, is_demo INTEGER DEFAULT 0, title TEXT NOT NULL,
                    authors TEXT, year INTEGER, venue TEXT, doi TEXT, category TEXT, research_area TEXT,
                    tags TEXT, abstract TEXT, summary TEXT, methodology TEXT, key_findings TEXT, limitations TEXT,
                    dataset TEXT, model TEXT, status TEXT, citations_count INTEGER, pdf_size TEXT, added_at TEXT,
                    original_text TEXT, cleaned_text TEXT, file_path TEXT)"""
            )
            conn.execute("INSERT INTO papers (id, title, is_demo) VALUES ('legacy', 'Legacy Paper', 1)")
            conn.commit()
            conn.close()

            database.init_db()

            with database.get_db_connection() as c:
                cols = {r["name"] for r in c.execute("PRAGMA table_info(papers)")}
                self.assertTrue({"original_filename", "size_bytes", "page_count", "uploaded_at"} <= cols)
                self.assertEqual(c.execute("SELECT title FROM papers WHERE id='legacy'").fetchone()["title"], "Legacy Paper")
        finally:
            database.DB_PATH = orig
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
