"""
Topic-support check: is the specific subject of a question actually present in the papers?

Embedding similarity alone cannot tell "explain the methodology" (generic, about whatever the
paper says) from "explain the methodology for protein folding" (a topic the paper may not
cover), because the generic structural words dominate the question. So we strip those words,
and whatever topical terms remain must be supported by the paper text, either literally
(most of the terms appear) or semantically (high similarity to some chunk).

Heuristic thresholds, calibrated on a small set of real and synthetic papers; not a guarantee.
"""
import re
from typing import List, Sequence

# Words that name a part of a paper or a generic request rather than a research topic.
_STOP = set(
    """a an the this that these those of in on at for to from with by about into over under between across and or but not
    what which who whom whose when where why how is are was were be been being do does did can could should would will may might
    please tell me explain describe give show list summarize summarise paper papers study studies article work authors author
    use used using uses acknowledge acknowledged state stated mention mentioned report reported discuss discussed propose proposed
    methodology method methods approach dataset datasets experiment experiments experimental setup baseline baselines
    limitation limitations result results finding findings conclusion conclusions abstract contribution contributions
    accuracy performance evaluation metric metrics model models main key overall way any some more most their its our
    compare comparison differences difference similarities research gap gaps question questions
    selected simple simply plain plainly terms words briefly detail detailed step steps easy easily understand understanding
    help helps explain explained overview summary""".split()
)

LEXICAL_COVERAGE_MIN = 0.5  # strictly more than half of the topic terms must appear in the papers
SEMANTIC_MIN = 0.25  # default for the local backend; the active backend passes its own value


def topic_terms(message: str) -> List[str]:
    words = re.findall(r"[a-z0-9][a-z0-9\-]+", message.lower())
    return [w for w in words if w not in _STOP and len(w) > 2]


def _present(term: str, corpus: str) -> bool:
    stem = term[:-1] if term.endswith("s") and len(term) > 3 else term
    return re.search(r"\b" + re.escape(stem), corpus) is not None


def lexical_coverage(terms: Sequence[str], corpus: str) -> float:
    if not terms:
        return 1.0
    return sum(_present(t, corpus) for t in terms) / len(terms)


def is_supported(terms: Sequence[str], corpus: str, semantic_score: float, semantic_min: float = SEMANTIC_MIN) -> bool:
    """corpus: lower-cased text of the selected papers; semantic_score: best cosine of the topical phrase."""
    if not terms:
        return True
    return lexical_coverage(terms, corpus) > LEXICAL_COVERAGE_MIN or semantic_score >= semantic_min
