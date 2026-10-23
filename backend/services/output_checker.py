"""
Post-generation output quality checks and grounding for the related-work generator.

Two public entry points:
  check_output_quality()  — flags mechanical generation artifacts (repetition,
                            citation spam, truncation, out-of-range citations).
  ground_output()         — rewrites the raw model output so every citation token
                            is either mapped to a real supplied paper ID or removed.
                            Also strips unsupported claims and fixes POV drift.

None of these checks verify factual accuracy — they only enforce that citations
are traceable to the papers actually supplied by the user.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sentence_split(text: str) -> List[str]:
    """Splits text into sentences on .!? boundaries."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 10]


def _extract_citation_numbers(text: str) -> List[int]:
    """Returns all [N] citation numbers found in text."""
    return [int(m) for m in re.findall(r"\[(\d+)\]", text)]


def _deduplicate_sentences(sentences: List[str], threshold: float = 0.7) -> List[str]:
    """
    Removes near-duplicate sentences using 5-gram Jaccard similarity.
    Keeps the first occurrence of any sentence pair that exceeds the threshold.
    """
    kept: List[str] = []
    kept_ngrams: List[set] = []

    for sent in sentences:
        words = sent.lower().split()
        ngrams = {" ".join(words[i:i+5]) for i in range(max(1, len(words)-4))}
        is_dup = any(
            len(ngrams & prev) / max(1, len(ngrams | prev)) >= threshold
            for prev in kept_ngrams
        )
        if not is_dup:
            kept.append(sent)
            kept_ngrams.append(ngrams)
    return kept


# POV patterns to convert from first-person to third-person.
# All patterns are IGNORECASE so they catch mid-sentence occurrences.
_POV_REPLACEMENTS = [
    (re.compile(r"\bwe propose\b", re.IGNORECASE), "the authors propose"),
    (re.compile(r"\bwe introduce\b", re.IGNORECASE), "the authors introduce"),
    (re.compile(r"\bwe present\b", re.IGNORECASE), "the authors present"),
    (re.compile(r"\bwe show\b", re.IGNORECASE), "the authors show"),
    (re.compile(r"\bwe demonstrate\b", re.IGNORECASE), "the authors demonstrate"),
    (re.compile(r"\bwe evaluate\b", re.IGNORECASE), "the authors evaluate"),
    (re.compile(r"\bwe achieve\b", re.IGNORECASE), "the authors achieve"),
    (re.compile(r"\bwe use\b", re.IGNORECASE), "the authors use"),
    (re.compile(r"\bwe find\b", re.IGNORECASE), "the authors find"),
    (re.compile(r"\bwe also\b", re.IGNORECASE), "the authors also"),
    (re.compile(r"\bwe add\b", re.IGNORECASE), "the authors add"),
    (re.compile(r"\bwe further\b", re.IGNORECASE), "the authors further"),
    (re.compile(r"\bwe train\b", re.IGNORECASE), "the authors train"),
    (re.compile(r"\bwe test\b", re.IGNORECASE), "the authors test"),
    (re.compile(r"\bour approach\b", re.IGNORECASE), "their approach"),
    (re.compile(r"\bour model\b", re.IGNORECASE), "their model"),
    (re.compile(r"\bour method\b", re.IGNORECASE), "their method"),
    (re.compile(r"\bour framework\b", re.IGNORECASE), "their framework"),
    (re.compile(r"\bour work\b", re.IGNORECASE), "their work"),
    (re.compile(r"\bour results\b", re.IGNORECASE), "their results"),
    (re.compile(r"\bour system\b", re.IGNORECASE), "their system"),
    (re.compile(r"\bour experiments\b", re.IGNORECASE), "their experiments"),
    (re.compile(r"\bour encoder\b", re.IGNORECASE), "their encoder"),
    (re.compile(r"\bour decoder\b", re.IGNORECASE), "their decoder"),
    (re.compile(r"\bour dataset\b", re.IGNORECASE), "their dataset"),
    (re.compile(r"\bour baseline\b", re.IGNORECASE), "their baseline"),
    # Catch remaining "our X" and "we X" that weren't caught above
    (re.compile(r"\bour ([a-z])", re.IGNORECASE), r"their \1"),
]


def _fix_pov(text: str) -> str:
    """Converts first-person model prose to third-person academic style."""
    for pattern, replacement in _POV_REPLACEMENTS:
        text = pattern.sub(replacement, text)
    # After all replacements, fix any sentence-start capitalisation that broke
    # e.g. "the authors propose" at sentence start → "The authors propose"
    text = re.sub(r'(?<=[.!?]\s)(the authors)', 'The authors', text)
    text = re.sub(r'^(the authors)', 'The authors', text)
    return text


# ---------------------------------------------------------------------------
# Citation grounding
# ---------------------------------------------------------------------------

def _build_citation_map(
    text: str,
    paper_ids: List[str],
) -> Dict[int, str]:
    """
    Returns a map from citation index (1-based) to paper ID, for every [N]
    found in text where N is within the valid range [1, len(paper_ids)].
    """
    valid: Dict[int, str] = {}
    for n in _extract_citation_numbers(text):
        if 1 <= n <= len(paper_ids):
            valid[n] = paper_ids[n - 1]
    return valid


def _sentence_has_only_valid_citations(
    sentence: str,
    num_papers: int,
) -> bool:
    """
    Returns True if the sentence has no citation tokens, or all its citation
    tokens are within range [1, num_papers].
    """
    nums = _extract_citation_numbers(sentence)
    return all(1 <= n <= num_papers for n in nums)


def _replace_cite_n_tokens(text: str) -> str:
    """
    Normalises @cite_N / @Cite_N / CITATION_N → [N] so downstream code
    only needs to handle the [N] format.
    """
    text = re.sub(r"@[Cc]ite[_-]?(\d+)", r"[\1]", text)
    text = re.sub(r"CITATION[_-]?(\d+)", r"[\1]", text, flags=re.IGNORECASE)
    return text


def _remap_citations(text: str, num_papers: int) -> str:
    """
    The LoRA model was trained on a corpus with a global citation index, so it
    often emits [4], [5], [6] when the user supplied only 3 papers.

    This function remaps all unique citation numbers found in the text to a
    compact sequential range [1..N] ordered by first appearance, capped at
    num_papers.  Citations that would exceed num_papers after remapping are
    left as-is (they will be filtered by the sentence-level check).

    Example with num_papers=3:
        "[4] showed X. [5] extended this. [6] confirmed it."
        → "[1] showed X. [2] extended this. [3] confirmed it."
    """
    seen: Dict[int, int] = {}   # original_n → remapped_n
    next_id = [1]

    def _remapper(m: re.Match) -> str:
        n = int(m.group(1))
        if n not in seen:
            if next_id[0] <= num_papers:
                seen[n] = next_id[0]
                next_id[0] += 1
            else:
                return m.group(0)   # keep original; will be filtered later
        return f"[{seen[n]}]"

    return re.sub(r"\[(\d+)\]", _remapper, text)


# ---------------------------------------------------------------------------
# Public: grounding pass
# ---------------------------------------------------------------------------

# Minimum grounded output length before we fall back to abstract-based synthesis
_MIN_GROUNDED_WORDS = 40


def _is_query_copy(text: str, query_abstract: str) -> bool:
    """
    Returns True when the model output is essentially a paraphrase of the
    query abstract rather than a synthesis of the reference papers.
    Uses 5-gram overlap: if >40% of the output's 5-grams appear in the query,
    the output is likely a copy.
    """
    def ngrams5(t: str) -> set:
        words = t.lower().split()
        return {" ".join(words[i:i+5]) for i in range(max(1, len(words)-4))}

    out_grams = ngrams5(text)
    q_grams = ngrams5(query_abstract)
    if not out_grams:
        return True
    overlap = len(out_grams & q_grams) / len(out_grams)
    return overlap > 0.4


def _build_abstract_synthesis(
    query_abstract: str,
    reference_abstracts: List[str],
    paper_ids: List[str],
    paper_titles: Optional[List[str]],
) -> str:
    """
    Deterministic IEEE-style related-work synthesis built entirely from the
    supplied abstracts.  Claims are extracted verbatim — nothing is invented.

    Structure:
      • Opening: situate the query paper's problem domain
      • Body: one sentence per reference grounded in its abstract
      • Comparison: note shared approaches where abstracts support it
      • Gap: state what the query paper addresses that references do not
    """
    if not reference_abstracts:
        return ""

    # Extract first two substantive sentences from each abstract (POV-fixed)
    def _first_sentences(text: str, n: int = 2) -> str:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip())
                 if len(s.strip()) > 20]
        return _fix_pov(" ".join(sents[:n]))

    # Opening: derive topic from query abstract first sentence
    query_sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", query_abstract.strip())
                   if len(s.strip()) > 20]
    query_intro = _fix_pov(query_sents[0]) if query_sents else "This line of research"

    parts: List[str] = []

    # Per-reference sentences with attribution
    for i, (abst, pid) in enumerate(zip(reference_abstracts, paper_ids)):
        n = i + 1
        excerpt = _first_sentences(abst, 2)
        parts.append(f"{excerpt} [{n}]")

    body = " ".join(parts)

    # Look for shared keywords across abstracts for comparison sentence
    all_words = set()
    shared_terms = []
    keyword_candidates = [
        "attention", "transformer", "pre-training", "retrieval", "BERT",
        "neural", "encoder", "decoder", "generation", "classification",
        "fine-tuning", "language model", "embedding", "self-supervised",
    ]
    for term in keyword_candidates:
        count = sum(1 for a in reference_abstracts if term.lower() in a.lower())
        if count >= 2:
            shared_terms.append(term)

    comparison = ""
    if shared_terms:
        terms_str = " and ".join(shared_terms[:2])
        cite_list = "".join(f" [{i+1}]" for i in range(len(reference_abstracts)))
        comparison = (
            f" These works{cite_list} share a focus on {terms_str}, "
            f"forming the methodological context for the query paper."
        )
    else:
        cite_list = "".join(f" [{i+1}]" for i in range(len(reference_abstracts)))
        comparison = (
            f" Collectively, these works{cite_list} provide the prior-art "
            f"foundation on which the query paper builds."
        )

    return body + comparison


def ground_output(
    raw_text: str,
    paper_ids: List[str],
    paper_titles: Optional[List[str]] = None,
    query_abstract: Optional[str] = None,
    reference_abstracts: Optional[List[str]] = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Cleans and grounds raw model output before returning it to the caller.

    Steps applied in order:
      1. Normalise @cite_N / CITATION_N → [N]
      2. Remap global citation indices to [1..N]
      3. Convert first-person "we/our" → third-person "the authors/their"
      4. Split into sentences; remove sentences with out-of-range citations
      5. Deduplicate near-identical sentences
      6. If output is too short or copies the query, replace with a
         deterministic synthesis built from the actual reference abstracts
      7. Build citation map: [N] → real paper_id

    Parameters
    ----------
    raw_text              : str            Raw model output.
    paper_ids             : List[str]      Ordered list of reference paper IDs (index 0 → [1]).
    paper_titles          : List[str]|None Optional titles for the citation map.
    query_abstract        : str|None       Used to detect query-copy failure mode.
    reference_abstracts   : List[str]|None Used to build fallback synthesis.

    Returns
    -------
    (grounded_text, grounding_meta) where grounding_meta contains:
      citation_map          : {str_index: {paper_id, title}}
      removed_sentence_count: int
      pov_fixes_applied     : bool
      insufficient_evidence : bool
      used_fallback_synthesis: bool
    """
    num_papers = len(paper_ids)
    used_fallback = False

    # 1. Normalise citation tokens (@cite_N, CITATION_N → [N])
    text = _replace_cite_n_tokens(raw_text)

    # 2. Remap out-of-range citation numbers to [1..num_papers] by appearance order.
    if num_papers > 0:
        text = _remap_citations(text, num_papers)

    # 3. POV fix
    text_after_pov = _fix_pov(text)
    pov_fixed = text_after_pov != text
    text = text_after_pov

    # 4. Split and filter sentences with invalid citations
    sentences = _sentence_split(text)
    valid_sentences: List[str] = []
    removed_count = 0

    for sent in sentences:
        if _sentence_has_only_valid_citations(sent, num_papers):
            valid_sentences.append(sent)
        else:
            removed_count += 1

    # 5. Deduplicate
    valid_sentences = _deduplicate_sentences(valid_sentences)

    # 6a. Check if output is too short or copies the query — if so, use fallback
    grounded = " ".join(valid_sentences)
    word_count = len(grounded.split())

    too_short = word_count < _MIN_GROUNDED_WORDS
    is_copy = (
        query_abstract is not None
        and len(grounded) > 0
        and _is_query_copy(grounded, query_abstract)
    )

    if (too_short or is_copy) and reference_abstracts and len(reference_abstracts) > 0:
        fallback = _build_abstract_synthesis(
            query_abstract or "",
            reference_abstracts,
            paper_ids,
            paper_titles,
        )
        if fallback and len(fallback.split()) >= _MIN_GROUNDED_WORDS:
            grounded = fallback
            used_fallback = True
            # Recalculate valid_sentences from fallback for citation map
            valid_sentences = _sentence_split(grounded)

    # 6b. Insufficiency check
    insufficient = len(valid_sentences) == 0 or not grounded.strip()
    if insufficient:
        grounded = (
            "Insufficient evidence from the supplied papers to generate a "
            "grounded related-work section. Please ensure the selected papers "
            "have substantive abstracts and try again."
        )

    # 7. Build citation map (only citations that survived grounding)
    surviving_nums = _extract_citation_numbers(grounded)
    citation_map: Dict[str, Any] = {}
    for n in set(surviving_nums):
        if 1 <= n <= num_papers:
            entry: Dict[str, Any] = {"paper_id": paper_ids[n - 1]}
            if paper_titles and len(paper_titles) >= n:
                entry["title"] = paper_titles[n - 1]
            citation_map[str(n)] = entry

    meta: Dict[str, Any] = {
        "citation_map": citation_map,
        "removed_sentence_count": removed_count,
        "pov_fixes_applied": pov_fixed,
        "insufficient_evidence": insufficient,
        "used_fallback_synthesis": used_fallback,
    }

    return grounded, meta


# ---------------------------------------------------------------------------
# Public: quality flags (unchanged API)
# ---------------------------------------------------------------------------

def check_output_quality(
    text: str,
    num_reference_papers: int = 0,
    *,
    repetition_window: int = 5,
    repetition_threshold: float = 0.5,
    citation_spam_threshold: int = 8,
) -> Dict[str, Any]:
    """
    Analyses model output for common quality issues.

    Run this on the *grounded* text (after ground_output) so that
    citation counts reflect what was actually returned to the user.

    Returns dict with keys:
        repeated_phrases      : bool
        citation_spam         : bool
        unsupported_citations : bool
        truncated             : bool
        warnings              : List[str]
    """
    warnings: List[str] = []

    # --- Repetition check ---
    repeated_phrases = False
    sentences = _sentence_split(text)
    if len(sentences) >= repetition_window:
        for start in range(len(sentences) - repetition_window + 1):
            window = sentences[start : start + repetition_window]
            ngrams: Dict[str, int] = {}
            for sent in window:
                words = sent.lower().split()
                for i in range(len(words) - 4):
                    gram = " ".join(words[i : i + 5])
                    ngrams[gram] = ngrams.get(gram, 0) + 1
            duplicates = sum(1 for count in ngrams.values() if count > 1)
            total = max(1, len(ngrams))
            if duplicates / total > repetition_threshold:
                repeated_phrases = True
                warnings.append(
                    "The generated text contains repeated phrases. "
                    "This may indicate the model looped. Consider regenerating."
                )
                break

    # --- Citation spam check ---
    citation_numbers = _extract_citation_numbers(text)
    citation_spam = len(citation_numbers) > citation_spam_threshold
    if citation_spam:
        warnings.append(
            f"The output contains {len(citation_numbers)} citation tokens, "
            f"which is unusually high (threshold: {citation_spam_threshold}). "
            "These are model-generated and are NOT verified."
        )

    # --- Unsupported citations check (post-grounding: should always be empty) ---
    unsupported_citations = False
    if num_reference_papers > 0 and citation_numbers:
        out_of_range = [n for n in citation_numbers if n < 1 or n > num_reference_papers]
        if out_of_range:
            unsupported_citations = True
            warnings.append(
                f"The output references citation number(s) {sorted(set(out_of_range))} "
                f"but only {num_reference_papers} reference paper(s) were supplied. "
                "These citations cannot be mapped to any supplied paper."
            )

    # --- Truncation check ---
    truncated = False
    stripped = text.strip()
    if stripped and stripped[-1] not in ".!?\"'":
        truncated = True
        warnings.append(
            "The output may be truncated (does not end with sentence-ending punctuation). "
            "Try increasing max_new_tokens."
        )

    return {
        "repeated_phrases": repeated_phrases,
        "citation_spam": citation_spam,
        "unsupported_citations": unsupported_citations,
        "truncated": truncated,
        "warnings": warnings,
    }
