import os
import unittest
from fastapi.testclient import TestClient

from backend.main import app
from backend.db.database import (
    get_db_connection,
    get_or_create_user,
    save_paper,
    get_paper,
    get_all_papers,
    delete_paper,
    init_db,
    seed_default_papers,
)
from backend.auth.firebase_auth import get_current_user, get_optional_current_user


class TestPaperOwnershipSecurity(unittest.TestCase):
    def setUp(self):
        # Mirror app startup so the schema (incl. later-added columns) and demo seed exist
        init_db()
        seed_default_papers()

        # Create test users in DB
        self.user_a = get_or_create_user("firebase-uid-alice", "Alice Researcher", "alice@example.com")
        self.user_b = get_or_create_user("firebase-uid-bob", "Bob Researcher", "bob@example.com")

        # Create paper owned by Alice
        self.paper_a = save_paper(
            {
                "id": "paper-alice-secret-01",
                "title": "Alice Confidential Quantum Paper",
                "authors": ["Alice"],
                "year": 2026,
                "category": "Quantum Computing",
                "abstract": "Secret quantum algorithm.",
                "summary": "Confidential",
                "methodology": "Quantum circuits",
                "keyFindings": ["Breakthrough"],
                "limitations": ["None"],
            },
            [
                {
                    "id": "paper-alice-sec-0",
                    "paper_id": "paper-alice-secret-01",
                    "section_type": "title",
                    "heading": "Title",
                    "content": "Alice Confidential Quantum Paper",
                }
            ],
            user_id=self.user_a["id"],
            is_demo=False
        )

        # Create paper owned by Bob
        self.paper_b = save_paper(
            {
                "id": "paper-bob-secret-01",
                "title": "Bob Private BioAI Paper",
                "authors": ["Bob"],
                "year": 2026,
                "category": "Bioinformatics",
                "abstract": "Private protein folding.",
                "summary": "Private",
                "methodology": "Graph models",
                "keyFindings": ["Novel fold"],
                "limitations": ["Small dataset"],
            },
            [
                {
                    "id": "paper-bob-sec-0",
                    "paper_id": "paper-bob-secret-01",
                    "section_type": "title",
                    "heading": "Title",
                    "content": "Bob Private BioAI Paper",
                }
            ],
            user_id=self.user_b["id"],
            is_demo=False
        )

    def tearDown(self):
        with get_db_connection() as conn:
            conn.execute("DELETE FROM papers WHERE id IN ('paper-alice-secret-01', 'paper-bob-secret-01')")
            conn.execute("DELETE FROM users WHERE firebase_uid IN ('firebase-uid-alice', 'firebase-uid-bob')")
            conn.commit()

    def test_user_a_isolation(self):
        """Alice only sees her own papers by default, not Bob's."""
        client = TestClient(app)
        app.dependency_overrides[get_optional_current_user] = lambda: self.user_a
        app.dependency_overrides[get_current_user] = lambda: self.user_a

        res = client.get("/api/v1/papers")
        self.assertEqual(res.status_code, 200)
        papers = res.json()
        paper_ids = [p["id"] for p in papers]

        # Alice must see Paper A
        self.assertIn("paper-alice-secret-01", paper_ids)
        # Alice must NOT see Bob's Paper B
        self.assertNotIn("paper-bob-secret-01", paper_ids)
        # Demo papers must NOT be mixed in without include_demo=true
        self.assertNotIn("paper-01", paper_ids)

        app.dependency_overrides.clear()

    def test_user_b_isolation(self):
        """Bob only sees his own papers by default, not Alice's."""
        client = TestClient(app)
        app.dependency_overrides[get_optional_current_user] = lambda: self.user_b
        app.dependency_overrides[get_current_user] = lambda: self.user_b

        res = client.get("/api/v1/papers")
        self.assertEqual(res.status_code, 200)
        papers = res.json()
        paper_ids = [p["id"] for p in papers]

        # Bob must see Paper B
        self.assertIn("paper-bob-secret-01", paper_ids)
        # Bob must NOT see Alice's Paper A
        self.assertNotIn("paper-alice-secret-01", paper_ids)
        # Demo papers must NOT be mixed in without include_demo=true
        self.assertNotIn("paper-01", paper_ids)

        app.dependency_overrides.clear()

    def test_unauthorized_detail_access_returns_404(self):
        """Bob attempting to access Alice's Paper A directly receives 404."""
        client = TestClient(app)
        app.dependency_overrides[get_optional_current_user] = lambda: self.user_b
        app.dependency_overrides[get_current_user] = lambda: self.user_b

        # Attempt to access Alice's paper
        res = client.get("/api/v1/papers/paper-alice-secret-01")
        self.assertEqual(res.status_code, 404, "Must return 404 for unauthorized paper access")

        # Attempt to access sections of Alice's paper
        res_sec = client.get("/api/v1/papers/paper-alice-secret-01/sections")
        self.assertEqual(res_sec.status_code, 404, "Must return 404 for unauthorized section access")

        app.dependency_overrides.clear()

    def test_demo_papers_accessible_as_demo(self):
        """Demo papers are accessible when explicitly requested or by unauthenticated visitors."""
        client = TestClient(app)
        app.dependency_overrides[get_optional_current_user] = lambda: self.user_a

        res = client.get("/api/v1/papers?include_demo=true")
        self.assertEqual(res.status_code, 200)
        papers = res.json()
        paper_ids = [p["id"] for p in papers]

        # Alice's paper is present
        self.assertIn("paper-alice-secret-01", paper_ids)
        # Demo benchmark paper is present and marked as demo
        self.assertIn("paper-01", paper_ids)
        demo_paper = next(p for p in papers if p["id"] == "paper-01")
        self.assertTrue(demo_paper.get("is_demo"))

        app.dependency_overrides.clear()

    def test_new_user_empty_library(self):
        """A brand new user with no uploads has an empty library (0 papers)."""
        new_user = get_or_create_user("firebase-uid-newbie", "Newbie Researcher", "newbie@example.com")
        client = TestClient(app)
        app.dependency_overrides[get_optional_current_user] = lambda: new_user

        res = client.get("/api/v1/papers")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [], "New user library must be completely empty []")

        # Stats must show 0 papers
        stats_res = client.get("/api/v1/stats")
        self.assertEqual(stats_res.status_code, 200)
        self.assertEqual(stats_res.json()["personalPapers"], 0)

        app.dependency_overrides.clear()
        with get_db_connection() as conn:
            conn.execute("DELETE FROM users WHERE firebase_uid = 'firebase-uid-newbie'")
            conn.commit()


if __name__ == "__main__":
    unittest.main()
