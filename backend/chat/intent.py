"""
Deterministic research-intent gate for the Research Mentor.

Runs on the backend before any retrieval or generation and costs no model call.
It is deliberately conservative: only clear research signals are in scope, clear
non-research requests and instruction-override attempts are refused, and anything
else becomes a clarifying question. It is not a security boundary on its own; the
answer model's system prompt enforces the same scope independently.
"""
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

PAPER_UNDERSTANDING = "PAPER_UNDERSTANDING"
METHODOLOGY = "METHODOLOGY"
PAPER_COMPARISON = "PAPER_COMPARISON"
LITERATURE_SURVEY = "LITERATURE_SURVEY"
RESEARCH_GAPS = "RESEARCH_GAPS"
DATASETS_AND_EXPERIMENTS = "DATASETS_AND_EXPERIMENTS"
RESULTS_AND_LIMITATIONS = "RESULTS_AND_LIMITATIONS"
ACADEMIC_DRAFT_FEEDBACK = "ACADEMIC_DRAFT_FEEDBACK"
RESEARCH_QUESTION_DEVELOPMENT = "RESEARCH_QUESTION_DEVELOPMENT"
OUT_OF_SCOPE = "OUT_OF_SCOPE"
UNCLEAR = "UNCLEAR"

IN_SCOPE_CATEGORIES = (
    PAPER_UNDERSTANDING,
    METHODOLOGY,
    PAPER_COMPARISON,
    LITERATURE_SURVEY,
    RESEARCH_GAPS,
    DATASETS_AND_EXPERIMENTS,
    RESULTS_AND_LIMITATIONS,
    ACADEMIC_DRAFT_FEEDBACK,
    RESEARCH_QUESTION_DEVELOPMENT,
)

REFUSAL_MESSAGE = (
    "I'm PaperPilot Research Mentor. I specialize in scientific papers, research methodology, "
    "literature surveys, and research analysis. I can't help with unrelated questions, but I can "
    "help you understand a paper, compare studies, or identify research gaps."
)

CLARIFY_MESSAGE = (
    "I want to make sure I help with the right thing. Could you tell me how your question relates to a "
    "scientific paper or your research? For example: \"Explain the methodology of my selected paper\", "
    "\"Compare the datasets used in these two studies\", or \"What limitations does this paper acknowledge?\""
)


@dataclass(frozen=True)
class IntentResult:
    category: str
    reason: str

    @property
    def in_scope(self) -> bool:
        return self.category in IN_SCOPE_CATEGORIES


def _rx(*patterns: str) -> "re.Pattern[str]":
    return re.compile("|".join(patterns), re.IGNORECASE)


# Attempts to override the assistant's rules or role. Refused outright.
_INJECTION = _rx(
    r"ignore (all |any |the |your )?(previous |prior |above |earlier )?(instructions|rules|prompt|restrictions)",
    r"disregard (all |any |the |your )?(previous |prior |above |earlier )?(instructions|rules|prompt)",
    r"forget (all |your |the )?(previous |prior )?(instructions|rules|restrictions)",
    r"(reveal|show|print|repeat|leak) (me )?(your |the )?(system|hidden|initial) (prompt|instructions|message)",
    r"\byou are (now|no longer)\b",
    r"\b(pretend|act|behave) (to be|as|like)\b",
    r"\brole-?play\b",
    r"\bjailbreak\b|\bdan mode\b|\bdeveloper mode\b",
    r"without (any )?(restrictions|limits|rules|filters)",
    r"bypass (the |your )?(rules|restrictions|filter|scope)",
)

# Creative or entertainment requests are refused even when they mention a paper.
_CREATIVE = _rx(
    r"\bjokes?\b",
    r"\bpoems?\b|\bpoetry\b|\blyrics\b|\bsongs?\b",
    r"\bstor(y|ies)\b",
    r"\bromantic\b|\blove letter\b",
    r"\brecipes?\b",
    r"\bhoroscope\b|\bastrology\b",
)

# Clearly non-research requests.
_OFF_TOPIC = _rx(
    r"\bweather\b|\bforecast\b",
    r"\b(cricket|football|soccer|nba|ipl|fifa|tennis|basketball)\b",
    r"\bwho won\b|\bmatch (score|result)s?\b",
    r"\b(movie|film|netflix|anime|celebrity|actor|actress)s?\b",
    r"\bgaming script\b|\bwrite (a |an )?(game|gaming)\b|\bgame (script|cheat|mod)\b",
    r"\b(dating|girlfriend|boyfriend)\b",
    r"\btravel (itinerary|plan)\b|\bhotel\b|\bflights?\b",
    r"\bhomework\b|\bwrite (my |an? )?(essay|email|cover letter|resume|cv)\b",
    r"\b(tiktok|instagram|youtube|whatsapp|facebook)\b",
    r"\b(website|landing page|todo app|login page|discord bot|telegram bot)\b",
    r"\bcook(ing)?\b",
)

# Generic coding requests; allowed only when tied to a study (see _STUDY_CODE).
_GENERIC_CODE = _rx(r"\bwrite (me )?(a |an |some )?(python|java|javascript|c\+\+|html|css|sql|bash|react)\b")
_STUDY_CODE = _rx(r"\b(experiment|study|paper|dataset|model|analysis|metric|results?|evaluation|f1|accuracy|statistic)")

# A bare arithmetic question such as "what is 1 + 1".
_BARE_MATH = re.compile(
    r"^\s*(what('s| is)|calculate|compute|solve)?\s*[\d\s+\-*/x×÷^().=]+\s*\??\s*$", re.IGNORECASE
)

# Strong research signals grouped by the category they imply. A word like "paper" or
# "research" alone is NOT enough; it must appear with substantive research vocabulary.
_SIGNALS: Dict[str, "re.Pattern[str]"] = {
    PAPER_COMPARISON: _rx(
        r"\bcompar(e|ing|ison)\b", r"\bcontrast\b", r"\bversus\b|\bvs\.?\b",
        r"\bdiffer(ence|ences|ent)? between\b", r"\b(both|these|the two|all) (papers|studies)\b", r"\bcontradict",
    ),
    LITERATURE_SURVEY: _rx(
        r"\bliterature (review|survey)\b", r"\bsurvey (paper|section|of)\b", r"\brelated work\b",
        r"\bsynthesi[sz]e?\b", r"\bthemes?\b.*\b(papers|studies|literature)\b", r"\bstate[- ]of[- ]the[- ]art\b",
    ),
    RESEARCH_GAPS: _rx(
        r"\bresearch gaps?\b", r"\bgaps? (in|across) (the )?(literature|studies|papers|research)\b",
        r"\bfuture (work|directions?|research)\b", r"\bunder-?explored\b", r"\bunanswered questions?\b",
        r"\bopen (problems?|questions?|challenges?)\b", r"\bnovelty\b",
    ),
    RESEARCH_QUESTION_DEVELOPMENT: _rx(
        r"\bresearch questions?\b", r"\bhypothes[ie]s\b", r"\bthesis (topic|question|statement)\b",
        r"\bproblem statement\b", r"\bresearch (objective|aim|proposal)s?\b",
    ),
    ACADEMIC_DRAFT_FEEDBACK: _rx(
        r"\b(my|this) (draft|abstract|introduction|literature review|methodology section|manuscript|thesis)\b",
        r"\b(improve|review|critique|proofread|feedback on)\b.*\b(abstract|draft|manuscript|literature review)\b",
        r"\bcitation (style|format)\b|\bapa\b|\bieee style\b|\bacademic (writing|tone)\b",
    ),
    DATASETS_AND_EXPERIMENTS: _rx(
        r"\bdatasets?\b", r"\bexperiment(s|al)?\b", r"\btrain(ing)?[ -](set|data|split)\b", r"\btest (set|split)\b",
        r"\bvalidation (set|split)\b", r"\bbaselines?\b", r"\bablation\b", r"\bhyper-?parameters?\b",
        r"\bsample size\b", r"\bevaluation (setup|protocol|metrics?)\b", r"\bcross-?validation\b",
    ),
    RESULTS_AND_LIMITATIONS: _rx(
        r"\bresults?\b", r"\bfindings?\b", r"\blimitations?\b", r"\bweakness(es)?\b", r"\baccuracy\b",
        r"\bprecision\b", r"\brecall\b", r"\bf1\b", r"\brouge\b|\bbleu\b|\bauc\b|\brmse\b|\bp-?values?\b",
        r"\bstatistical(ly)? signific", r"\bconfidence interval\b", r"\bgenerali[sz]", r"\bbias(es)?\b",
        r"\bthreats? to validity\b", r"\bconclusions?\b", r"\breproducib",
    ),
    METHODOLOGY: _rx(
        r"\bmethodolog(y|ies)\b", r"\bmethods?\b", r"\bapproach\b", r"\balgorithm\b", r"\barchitecture\b",
        r"\bresearch design\b|\bstudy design\b|\bsampling\b|\bqualitative\b|\bquantitative\b|\brandomi[sz]ed\b",
        r"\bneural networks?\b|\bregression\b|\bclassifier\b|\bfine-?tun",
        r"\bhow (did|do) (the )?(authors|they)\b", r"\bsystematic review\b|\bmeta-?analysis\b|\bpeer review\b",
    ),
    PAPER_UNDERSTANDING: _rx(
        r"\b(this|the|my|selected|uploaded|attached) (paper|study|article|manuscript|publication|pdf)\b",
        r"\bthe authors?\b", r"\babstract\b", r"\bmain (contribution|idea|claim)s?\b", r"\bresearch problem\b",
        r"\bcontribution\b", r"\bwhat (does|did) (this|the) (paper|study)\b",
    ),
}

# Foundational research / statistics / ML concepts the mentor may explain on their own.
_CONCEPTS = _rx(
    r"\bprecision\b", r"\brecall\b", r"\bf1[- ]score\b", r"\bp-?values?\b", r"\bstatistical significance\b",
    r"\bconfidence interval\b", r"\boverfitting\b|\bunderfitting\b", r"\bcross-?validation\b",
    r"\bneural networks?\b", r"\bgradient descent\b", r"\battention mechanism\b", r"\btransformers?\b",
    r"\bnull hypothesis\b", r"\bconfounding\b", r"\bblinding\b", r"\bsampling bias\b",
    r"\btf-?idf\b|\bembeddings?\b|\bretrieval[- ]augmented\b", r"\bvalidity\b|\breliability\b",
)

# Short follow-ups that only make sense in the context of the prior in-scope turn.
_FOLLOW_UP = re.compile(
    r"^\s*(why|how|what about|and|so|can you|could you|please|explain|elaborate|go on|continue|more|"
    r"tell me more|give (me )?(an )?example|in simple (words|terms)|simpler|shorter|longer)\b.{0,80}$",
    re.IGNORECASE,
)

# When several categories match, the more specific research workflow wins.
_PRIORITY: Sequence[str] = (
    PAPER_COMPARISON,
    LITERATURE_SURVEY,
    RESEARCH_GAPS,
    RESEARCH_QUESTION_DEVELOPMENT,
    ACADEMIC_DRAFT_FEEDBACK,
    DATASETS_AND_EXPERIMENTS,
    RESULTS_AND_LIMITATIONS,
    METHODOLOGY,
    PAPER_UNDERSTANDING,
)


def classify_intent(message: str, previous_category: Optional[str] = None) -> IntentResult:
    """Classifies one user message. previous_category is the last in-scope category in this chat, if any."""
    text = (message or "").strip()
    if not text:
        return IntentResult(UNCLEAR, "empty message")

    if _INJECTION.search(text):
        return IntentResult(OUT_OF_SCOPE, "instruction-override or role-play attempt")
    if _CREATIVE.search(text):
        return IntentResult(OUT_OF_SCOPE, "creative or entertainment request")

    matched: List[str] = [c for c in _PRIORITY if _SIGNALS[c].search(text)]

    if _BARE_MATH.match(text):
        return IntentResult(OUT_OF_SCOPE, "bare arithmetic")
    if _GENERIC_CODE.search(text) and not _STUDY_CODE.search(text):
        return IntentResult(OUT_OF_SCOPE, "generic coding request unrelated to a study")
    if _OFF_TOPIC.search(text):
        return IntentResult(OUT_OF_SCOPE, "unrelated to scientific research")

    if matched:
        return IntentResult(matched[0], "research signals: " + ", ".join(matched))
    if _CONCEPTS.search(text):
        return IntentResult(METHODOLOGY, "foundational research concept")

    if previous_category in IN_SCOPE_CATEGORIES and _FOLLOW_UP.match(text):
        return IntentResult(previous_category, "follow-up to an in-scope turn")

    return IntentResult(UNCLEAR, "no clear research intent")
