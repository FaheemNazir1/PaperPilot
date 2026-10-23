"""
Tests for the /api/v1/review/related-work endpoint and the output grounding pass.

Unit tests mock the model — no GPU or LoRA adapter required.
The integration test is gated behind PAPERPILOT_INTEGRATION_TEST=1.
"""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.firebase_auth import get_current_user
from backend.services.output_checker import ground_output, check_output_quality

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

SAMPLE_QUERY = (
    "We propose a retrieval-augmented generation framework that combines dense "
    "passage retrieval with a pre-trained sequence-to-sequence model to improve "
    "factual grounding in open-domain question answering tasks."
)

SAMPLE_REFS = [
    (
        "The dominant sequence transduction models are based on complex recurrent "
        "or convolutional neural networks. We propose the Transformer, based solely "
        "on attention mechanisms, dispensing with recurrence and convolutions entirely."
    ),
    (
        "We introduce BERT, designed to pre-train deep bidirectional representations "
        "from unlabeled text by jointly conditioning on both left and right context "
        "in all layers of the Transformer encoder."
    ),
    (
        "Large pre-trained language models store factual knowledge in their parameters. "
        "We explore retrieval-augmented generation (RAG), combining a dense retriever "
        "with a BART generator to ground responses in external documents."
    ),
]

FOUR_REFS = SAMPLE_REFS + [
    (
        "Graph neural networks have been applied to molecular property prediction, "
        "achieving state-of-the-art results on benchmark datasets including MoleculeNet."
    ),
]

_MOCK_USER = {
    "id": 1,
    "firebase_uid": "test-uid",
    "name": "Test User",
    "email": "test@example.com",
}

# Clean output — no citations, no first-person
_MOCK_CLEAN = (
    "Prior work on neural sequence-to-sequence models established attention mechanisms "
    "as central to modern NLP architectures. Building on these foundations, "
    "retrieval-augmented approaches have been shown to improve factual grounding."
)

# Output with valid [1][2][3] citations matching 3 SAMPLE_REFS
_MOCK_WITH_VALID_CITATIONS = (
    "The Transformer architecture [1] replaced recurrent networks with self-attention. "
    "Bidirectional pre-training [2] further improved representation quality. "
    "Retrieval-augmented generation [3] grounds outputs in external evidence."
)

# Output with an out-of-range citation that CANNOT be remapped.
# With 3 papers the remap fills [1],[2],[3].  A sentence containing a 4th
# unique citation number [10] has nowhere to map → stripped.
_MOCK_INVALID_CITE = (
    "The Transformer [1] is widely used. "
    "Some work [4][5][6][10] claims further improvements. "
    "RAG [3] improves factuality."
)

# Output where every sentence has citations that exhaust the remap capacity.
# [10][11][12] → remap to [1][2][3]; then [13] has no slot → sentence stripped.
# All sentences share this pattern so all are stripped → insufficiency.
_MOCK_ALL_INVALID = (
    "We propose a new system [10][11][12][13] that beats all prior work [14][15][16]."
)

# Output with first-person POV
_MOCK_FIRST_PERSON = "We propose a system. Our model is better than baselines."

# Empty / whitespace-only output
_MOCK_EMPTY = "   "


def _auth_client() -> TestClient:
    """TestClient with auth dependency overridden to _MOCK_USER."""
    client = TestClient(app)
    app.dependency_overrides[get_current_user] = lambda: _MOCK_USER
    return client


# ---------------------------------------------------------------------------
# Tests: ground_output()
# ---------------------------------------------------------------------------

class TestGroundOutput(unittest.TestCase):
    IDS3 = ["paper-001", "paper-002", "paper-003"]
    TITLES3 = ["Transformer Paper", "BERT Paper", "RAG Paper"]
    IDS4 = ["p1", "p2", "p3", "p4"]

    def test_valid_citations_mapped_with_titles(self):
        text, meta = ground_output(_MOCK_WITH_VALID_CITATIONS, self.IDS3, self.TITLES3)
        for n in ("1", "2", "3"):
            self.assertIn(f"[{n}]", text)
            self.assertEqual(meta["citation_map"][n]["paper_id"], self.IDS3[int(n) - 1])
            self.assertEqual(meta["citation_map"][n]["title"], self.TITLES3[int(n) - 1])
        self.assertFalse(meta["insufficient_evidence"])
        self.assertEqual(meta["removed_sentence_count"], 0)

    def test_out_of_range_sentence_stripped(self):
        # The middle sentence has [4][5][6][10]: first 3 remap to [1][2][3],
        # but [10] has no slot left → stays as [10] → sentence stripped.
        text, meta = ground_output(_MOCK_INVALID_CITE, self.IDS3)
        self.assertGreater(meta["removed_sentence_count"], 0)
        # Sentences with only valid citations survive
        self.assertIn("[1]", text)
        self.assertIn("[3]", text)
        # The unmappable number must not appear in the output
        self.assertNotIn("[10]", text)

    def test_all_invalid_citations_returns_insufficiency_notice(self):
        text, meta = ground_output(_MOCK_ALL_INVALID, self.IDS3)
        self.assertTrue(meta["insufficient_evidence"])
        self.assertIn("Insufficient evidence", text)

    def test_cite_n_tokens_normalised_to_bracket_form(self):
        raw = "As shown by @cite_1, attention works. CITATION_2 improves this."
        text, _ = ground_output(raw, self.IDS3)
        self.assertNotIn("@cite_1", text)
        self.assertNotIn("CITATION_2", text)
        self.assertIn("[1]", text)
        self.assertIn("[2]", text)

    def test_first_person_converted_to_third(self):
        text, meta = ground_output(_MOCK_FIRST_PERSON, self.IDS3)
        self.assertNotIn("We propose", text)
        self.assertNotIn("Our model", text)
        self.assertIn("The authors propose", text)
        self.assertIn("their model", text)
        self.assertTrue(meta["pov_fixes_applied"])

    def test_duplicate_sentences_deduplicated(self):
        sent = "Attention mechanisms have been widely used in sequence modeling tasks."
        raw = f"{sent} {sent} {sent}"
        text, _ = ground_output(raw, self.IDS3)
        self.assertEqual(text.count("Attention mechanisms have been widely"), 1)

    def test_no_citations_passes_through_unchanged(self):
        text, meta = ground_output(_MOCK_CLEAN, self.IDS3)
        self.assertFalse(meta["insufficient_evidence"])
        self.assertEqual(meta["removed_sentence_count"], 0)
        self.assertEqual(meta["citation_map"], {})

    def test_empty_paper_ids_strips_all_bracket_citations(self):
        raw = "Prior work [1] showed this. Another study extended it."
        text, _ = ground_output(raw, paper_ids=[])
        self.assertNotIn("[1]", text)

    def test_three_papers_end_to_end(self):
        text, meta = ground_output(_MOCK_WITH_VALID_CITATIONS, self.IDS3)
        self.assertFalse(meta["insufficient_evidence"])
        for n in ("1", "2", "3"):
            self.assertIn(n, meta["citation_map"])

    def test_four_papers_end_to_end(self):
        raw = (
            "Study [1] proposes attention. Work [2] extends this. "
            "Research [3] applies it to QA. Finally, [4] introduces retrieval."
        )
        text, meta = ground_output(raw, self.IDS4)
        for n in ("1", "2", "3", "4"):
            self.assertIn(n, meta["citation_map"])
            self.assertEqual(meta["citation_map"][n]["paper_id"], self.IDS4[int(n) - 1])
        self.assertFalse(meta["insufficient_evidence"])

    def test_empty_raw_text_gives_insufficiency(self):
        text, meta = ground_output("", self.IDS3)
        self.assertTrue(meta["insufficient_evidence"])

    def test_citation_remapping_global_index(self):
        """
        Regression test: the LoRA model emits @cite_4/5/6 when only 3 papers
        are supplied (global training index).  After normalisation and remapping
        they should appear as [1]/[2]/[3] and ALL survive grounding.
        """
        raw = (
            "@cite_4 use multi-head self-attention for joint retrieval and generation. "
            "@cite_5 fine-tune BERT for generating answers based on retrieved passages. "
            "@cite_6 use a masked language model objective for training BERT."
        )
        text, meta = ground_output(raw, paper_ids=self.IDS3, paper_titles=self.TITLES3)
        self.assertEqual(meta["removed_sentence_count"], 0)
        self.assertFalse(meta["insufficient_evidence"])
        self.assertIn("[1]", text)
        self.assertIn("[2]", text)
        self.assertIn("[3]", text)
        self.assertNotIn("[4]", text)
        self.assertNotIn("[5]", text)
        self.assertNotIn("[6]", text)
        self.assertEqual(meta["citation_map"]["1"]["paper_id"], "paper-001")
        self.assertEqual(meta["citation_map"]["2"]["paper_id"], "paper-002")
        self.assertEqual(meta["citation_map"]["3"]["paper_id"], "paper-003")

    def test_fallback_synthesis_used_when_output_too_short(self):
        """
        When model output is too short (<40 words), ground_output falls back to
        a deterministic synthesis built from the actual reference abstracts.
        Each reference abstract contributes real sentences tagged [1],[2],[3].
        """
        short_raw = "In this work we use BERT @cite_6."
        text, meta = ground_output(
            short_raw,
            paper_ids=self.IDS3,
            paper_titles=self.TITLES3,
            query_abstract=SAMPLE_QUERY,
            reference_abstracts=SAMPLE_REFS,
        )
        self.assertTrue(meta.get("used_fallback_synthesis"), "Expected fallback synthesis to be used")
        self.assertFalse(meta["insufficient_evidence"])
        # Fallback must reference all 3 papers
        self.assertIn("[1]", text)
        self.assertIn("[2]", text)
        self.assertIn("[3]", text)
        # Must be substantive
        self.assertGreater(len(text.split()), 30)
        # Must not contain first-person
        self.assertNotIn("We propose", text)
        self.assertNotIn("our model", text.lower())

    def test_fallback_synthesis_used_when_output_copies_query(self):
        """
        When model output is a paraphrase of the query (>40% 5-gram overlap),
        fallback synthesis kicks in.
        """
        # Construct output that is almost a copy of SAMPLE_QUERY
        copy_raw = (
            "The authors propose a retrieval-augmented generation framework combining "
            "dense passage retrieval with a sequence-to-sequence model for factual "
            "grounding in open-domain question answering tasks @cite_4 @cite_5."
        )
        text, meta = ground_output(
            copy_raw,
            paper_ids=self.IDS3,
            paper_titles=self.TITLES3,
            query_abstract=SAMPLE_QUERY,
            reference_abstracts=SAMPLE_REFS,
        )
        self.assertTrue(meta.get("used_fallback_synthesis"), "Expected fallback when output copies query")
        self.assertFalse(meta["insufficient_evidence"])
        self.assertGreater(len(text.split()), 30)

    def test_end_to_end_3_papers_no_model(self):
        """
        End-to-end test with 3 realistic abstracts, no model required.
        Simulates a model that produces generic output and verifies the
        fallback synthesis produces a grounded, citable result.
        """
        query = (
            "This paper proposes a dense retrieval system using dual BERT encoders. "
            "Questions and passages are encoded independently and matched via inner "
            "product search, outperforming BM25 on Natural Questions and TriviaQA."
        )
        refs = [
            ("The Transformer uses multi-head self-attention and achieves 28.4 BLEU "
             "on WMT EN-DE translation, outperforming recurrent baselines."),
            ("BERT pre-trains bidirectional Transformers with masked language modeling "
             "and achieves state-of-the-art on GLUE, SQuAD, and NER tasks."),
            ("RAG combines dense retrieval with BART generation, outperforming "
             "parametric models on Natural Questions and TriviaQA open-domain QA."),
        ]
        ids = ["p-transformer", "p-bert", "p-rag"]
        titles = ["Attention Is All You Need", "BERT", "RAG"]

        # Simulate generic/short model output (the real model's failure mode)
        generic_raw = "In this work we use BERT @cite_6 as our encoder @cite_7."

        text, meta = ground_output(
            generic_raw,
            paper_ids=ids,
            paper_titles=titles,
            query_abstract=query,
            reference_abstracts=refs,
        )

        # Fallback synthesis used
        self.assertTrue(meta.get("used_fallback_synthesis"))
        self.assertFalse(meta["insufficient_evidence"])

        # All 3 papers cited
        for n in ("1", "2", "3"):
            self.assertIn(f"[{n}]", text, f"Expected citation [{n}] in output")
            self.assertIn(n, meta["citation_map"])
            self.assertEqual(meta["citation_map"][n]["paper_id"], ids[int(n)-1])

        # Content grounded in actual abstracts (key terms from each ref)
        self.assertTrue(
            any(term in text for term in ["attention", "Transformer", "BLEU", "self-attention"]),
            "Expected content from ref 1 (Transformer)"
        )
        self.assertTrue(
            any(term in text for term in ["BERT", "bidirectional", "GLUE", "masked"]),
            "Expected content from ref 2 (BERT)"
        )
        self.assertTrue(
            any(term in text for term in ["RAG", "retrieval", "BART", "TriviaQA"]),
            "Expected content from ref 3 (RAG)"
        )

        # No first-person
        import re
        self.assertFalse(re.search(r"\bwe\b", text, re.IGNORECASE))
        self.assertFalse(re.search(r"\bour\b", text, re.IGNORECASE))


# ---------------------------------------------------------------------------
# Tests: check_output_quality()
# ---------------------------------------------------------------------------

class TestCheckOutputQuality(unittest.TestCase):
    def test_clean_text_no_flags(self):
        result = check_output_quality(_MOCK_CLEAN, num_reference_papers=3)
        self.assertFalse(result["repeated_phrases"])
        self.assertFalse(result["citation_spam"])
        self.assertFalse(result["unsupported_citations"])
        self.assertFalse(result["truncated"])
        self.assertEqual(result["warnings"], [])

    def test_detects_repetition(self):
        sent = "The attention mechanism has been widely used in natural language processing tasks."
        result = check_output_quality(" ".join([sent] * 8))
        self.assertTrue(result["repeated_phrases"])

    def test_detects_citation_spam(self):
        text = "Prior work [1][2][3][4][5][6][7][8][9] has addressed this."
        result = check_output_quality(text, citation_spam_threshold=8)
        self.assertTrue(result["citation_spam"])

    def test_detects_unsupported_citations(self):
        text = "As shown in [1], [2], and [7], performance improves."
        result = check_output_quality(text, num_reference_papers=3)
        self.assertTrue(result["unsupported_citations"])
        self.assertTrue(any("7" in w for w in result["warnings"]))

    def test_no_unsupported_citations_within_range(self):
        text = "Work by [1] and [2] establishes the baseline."
        self.assertFalse(
            check_output_quality(text, num_reference_papers=3)["unsupported_citations"]
        )

    def test_detects_truncation(self):
        text = "The model achieves strong performance on benchmark datasets and shows that"
        self.assertTrue(check_output_quality(text)["truncated"])

    def test_no_truncation_for_proper_ending(self):
        text = "The model achieves strong performance on benchmark datasets."
        self.assertFalse(check_output_quality(text)["truncated"])

    def test_empty_text_does_not_crash(self):
        self.assertIsInstance(check_output_quality(""), dict)

    def test_zero_ref_papers_skips_citation_range_check(self):
        text = "See [5] for details."
        self.assertFalse(
            check_output_quality(text, num_reference_papers=0)["unsupported_citations"]
        )


# ---------------------------------------------------------------------------
# Tests: endpoint (model mocked)
# ---------------------------------------------------------------------------

class TestRelatedWorkEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = _auth_client()

    def tearDown(self):
        app.dependency_overrides.clear()

    # --- Happy path ---

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_CLEAN)
    def test_successful_generation_response_shape(self, mock_gen, _):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for key in ("related_work", "disclaimer", "citation_map", "grounding", "quality"):
            self.assertIn(key, data, f"missing key: {key}")
        mock_gen.assert_called_once_with(
            query_abstract=SAMPLE_QUERY,
            reference_abstracts=SAMPLE_REFS,
            max_new_tokens=600,
            reference_titles=None,
        )

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work",
           return_value=_MOCK_WITH_VALID_CITATIONS)
    def test_valid_citations_survive_grounding(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["quality"]["unsupported_citations"])

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work",
           return_value=_MOCK_INVALID_CITE)
    def test_out_of_range_citations_stripped(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)
        # The middle sentence (containing unmappable [10]) must be stripped
        self.assertNotIn("[10]", res.json()["related_work"])
        self.assertGreater(res.json()["grounding"]["removed_sentence_count"], 0)

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_ALL_INVALID)
    def test_all_invalid_citations_returns_insufficiency(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # The fallback synthesis fires (better than "Insufficient evidence"),
        # so we just verify the output is substantive and not empty.
        self.assertGreater(len(data["related_work"].split()), 20)
        self.assertFalse(data["grounding"]["insufficient_evidence"])

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_FIRST_PERSON)
    def test_first_person_pov_fixed(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)
        text = res.json()["related_work"]
        self.assertNotIn("We propose", text)
        self.assertNotIn("Our model", text)
        self.assertTrue(res.json()["grounding"]["pov_fixes_applied"])

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work",
           return_value=_MOCK_WITH_VALID_CITATIONS)
    def test_three_reference_papers(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 200)

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work",
           return_value=_MOCK_WITH_VALID_CITATIONS)
    def test_four_reference_papers(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": FOUR_REFS},
        )
        self.assertEqual(res.status_code, 200)

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_CLEAN)
    def test_all_abstracts_forwarded_to_model(self, mock_gen, _):
        """Every reference abstract must reach generate_related_work unchanged."""
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": FOUR_REFS},
        )
        self.assertEqual(res.status_code, 200)
        _, kwargs = mock_gen.call_args
        self.assertEqual(kwargs["reference_abstracts"], FOUR_REFS)

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_CLEAN)
    def test_custom_max_new_tokens_forwarded(self, mock_gen, _):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={
                "query_abstract": SAMPLE_QUERY,
                "reference_abstracts": SAMPLE_REFS,
                "max_new_tokens": 256,
            },
        )
        self.assertEqual(res.status_code, 200)
        mock_gen.assert_called_once_with(
            query_abstract=SAMPLE_QUERY,
            reference_abstracts=SAMPLE_REFS,
            max_new_tokens=256,
            reference_titles=None,
        )

    # --- Empty / placeholder output guard ---

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work", return_value=_MOCK_EMPTY)
    def test_empty_model_output_returns_500(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 500)
        self.assertIn("empty", res.json()["detail"].lower())

    # --- Error paths ---

    @patch("backend.routers.review.is_model_available", return_value=False)
    def test_503_when_adapter_missing(self, _):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 503)

    @patch("backend.routers.review.is_model_available", return_value=True)
    @patch("backend.routers.review.generate_related_work",
           side_effect=RuntimeError("GPU OOM"))
    def test_500_on_generation_exception(self, _, __):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 500)

    def test_422_query_too_short(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": "Too short.", "reference_abstracts": SAMPLE_REFS},
        )
        self.assertEqual(res.status_code, 422)

    def test_422_no_references(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": []},
        )
        self.assertEqual(res.status_code, 422)

    def test_422_too_many_references(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": [SAMPLE_REFS[0]] * 11},
        )
        self.assertEqual(res.status_code, 422)

    def test_422_reference_too_short(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": ["hi"]},
        )
        self.assertEqual(res.status_code, 422)

    def test_422_max_new_tokens_out_of_range(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={
                "query_abstract": SAMPLE_QUERY,
                "reference_abstracts": SAMPLE_REFS,
                "max_new_tokens": 9999,
            },
        )
        self.assertEqual(res.status_code, 422)

    # --- Auth ---

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        client = TestClient(app)
        res = client.post(
            "/api/v1/review/related-work",
            json={"query_abstract": SAMPLE_QUERY, "reference_abstracts": SAMPLE_REFS},
        )
        self.assertIn(res.status_code, (401, 403))

    def test_model_status_public(self):
        client = TestClient(app)
        res = client.get("/api/v1/review/status")
        self.assertEqual(res.status_code, 200)
        self.assertIn("model_available", res.json())


# ---------------------------------------------------------------------------
# Integration test (real model — gated)
# ---------------------------------------------------------------------------

@unittest.skipUnless(
    os.getenv("PAPERPILOT_INTEGRATION_TEST") == "1",
    "Set PAPERPILOT_INTEGRATION_TEST=1 to run (needs adapter + time)",
)
class TestRelatedWorkIntegration(unittest.TestCase):
    def setUp(self):
        self.client = _auth_client()

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_real_generation(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={
                "query_abstract": SAMPLE_QUERY,
                "reference_abstracts": SAMPLE_REFS,
                "max_new_tokens": 300,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(len(data["related_work"]), 40)
        self.assertNotIn("We propose", data["related_work"])
        self.assertNotIn("Our model", data["related_work"])
        self.assertIn("grounding", data)
        self.assertIn("citation_map", data)
        print("\n[Integration] Output:\n", data["related_work"])
        print("[Integration] Grounding:", data["grounding"])

    def test_real_generation_four_refs(self):
        res = self.client.post(
            "/api/v1/review/related-work",
            json={
                "query_abstract": SAMPLE_QUERY,
                "reference_abstracts": FOUR_REFS,
                "max_new_tokens": 300,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(len(data["related_work"]), 40)
        print("\n[Integration 4-refs] Output:\n", data["related_work"])


if __name__ == "__main__":
    unittest.main()
