import logging
import re
import threading
import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.firebase_auth import get_current_user
from backend.chat import embeddings
from backend.chat import index as paper_index
from backend.chat import intent, llm, topic
from backend.db.database import get_all_papers, get_owned_file_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_TURNS = 8
MAX_HISTORY_CHARS = 1500
MAX_PAPERS_PER_QUESTION = 8
# Relevance thresholds live with each embedding backend (backend/chat/embeddings.py): cosine scores
# from different embedding models are not comparable.
RATE_LIMIT_PER_MINUTE = 20

# Categories whose answers must rest on the user's papers; without evidence we say so
# instead of letting the model fill the gap from memory.
PAPER_GROUNDED = {
    intent.PAPER_UNDERSTANDING,
    intent.PAPER_COMPARISON,
    intent.LITERATURE_SURVEY,
    intent.RESEARCH_GAPS,
    intent.DATASETS_AND_EXPERIMENTS,
    intent.RESULTS_AND_LIMITATIONS,
}

NO_PAPERS_MESSAGE = (
    "I need papers to analyze before I can answer this. Upload a paper to your library (and select it here) "
    "and I'll ground my answer in its actual text. I won't invent findings or citations."
)
INSUFFICIENT_EVIDENCE_MESSAGE = (
    "I can help analyze this research question, but the papers currently available do not provide enough "
    "evidence to answer it reliably. Upload a relevant paper or select additional studies. "
    "I won't invent findings or citations."
)


class ChatTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=10_000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    paper_ids: Optional[List[str]] = Field(default=None, max_length=50)
    history: List[ChatTurn] = Field(default_factory=list, max_length=50)


_rate_lock = threading.Lock()
_recent_requests: Dict[int, Deque[float]] = defaultdict(deque)


def _check_rate_limit(user_id: int) -> None:
    now = time.monotonic()
    with _rate_lock:
        window = _recent_requests[user_id]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(status_code=429, detail="You're sending messages too quickly. Please wait a moment.")
        window.append(now)


def _clean_history(history: List[ChatTurn]) -> List[Dict[str, str]]:
    return [
        {"role": t.role, "content": t.content.strip()[:MAX_HISTORY_CHARS]}
        for t in history[-MAX_HISTORY_TURNS:]
        if t.content.strip()
    ]


def _previous_category(history: List[Dict[str, str]]) -> Optional[str]:
    """Last in-scope category among earlier user messages (derived server-side, never trusted from the client)."""
    for turn in reversed(history):
        if turn["role"] == "user":
            result = intent.classify_intent(turn["content"])
            if result.in_scope:
                return result.category
    return None


def _reply(category: str, answer: str, status: str, **extra: Any) -> Dict[str, Any]:
    base: Dict[str, Any] = {
        "category": category,
        "status": status,  # answered | refused | clarify | no_papers | insufficient_evidence
        "answer": answer,
        "citations": [],
        "evidence": {"papersSearched": [], "papersUnavailable": []},
        "model": None,
    }
    base.update(extra)
    return base


# Words in a question that name the part of a paper it is about -> section labels to favour.
_SECTION_HINTS = (
    (re.compile(r"\bmethod(s|ology|ologies)?\b|\bapproach\b|\bhow did (the )?(authors|they)\b|\balgorithm\b|\barchitecture\b", re.I), {"methodology"}),
    (re.compile(r"\blimitations?\b|\bweakness(es)?\b|\bfuture work\b|\bgaps?\b|\bshortcomings?\b", re.I), {"limitations", "discussion", "conclusion"}),
    (re.compile(r"\babstract\b|\bsummari[sz]e\b|\bcontributions?\b|\bmain idea\b|\bresearch problem\b|\bmotivation\b|\boverview\b", re.I), {"abstract", "introduction", "body"}),
    (re.compile(r"\bresults?\b|\bfindings?\b|\bperformance\b|\baccuracy\b|\bevaluation\b|\bmetrics?\b", re.I), {"results", "discussion"}),
    (re.compile(r"\bdatasets?\b|\bexperiment(s|al)?\b|\bsetup\b|\bbaselines?\b", re.I), {"methodology", "results"}),
    (re.compile(r"\bconclusions?\b", re.I), {"conclusion"}),
    (re.compile(r"\bintroduction\b|\bbackground\b|\brelated work\b", re.I), {"introduction"}),
)


def _section_hints(message: str) -> set:
    hints: set = set()
    for pattern, sections in _SECTION_HINTS:
        if pattern.search(message):
            hints |= sections
    return hints


def _owned_papers(user_id: int, requested_ids: Optional[List[str]]) -> List[Dict[str, Any]]:
    """The caller's own uploaded papers that have a stored PDF, optionally limited to requested_ids."""
    mine = get_all_papers(user_id=user_id, include_demo=False)
    eligible = []
    for p in mine:
        if p.get("is_demo"):
            continue
        if requested_ids is not None and p["id"] not in requested_ids:
            continue
        path = get_owned_file_path(p["id"], user_id)
        if path:
            eligible.append({"id": p["id"], "title": p.get("title") or "Untitled paper", "path": path})
    return eligible


def _citations_used(answer: str, chunks: List[paper_index.Chunk]) -> List[Dict[str, Any]]:
    used = sorted({int(n) for n in re.findall(r"\[(\d{1,2})\]", answer) if 1 <= int(n) <= len(chunks)})
    citations = []
    for n in used:
        c = chunks[n - 1]
        citations.append(
            {
                "ref": n,
                "paperId": c.paper_id,
                "paperTitle": c.paper_title,
                "section": c.section.replace("|", ", "),
                "pageStart": c.page_start,
                "pageEnd": c.page_end,
                "chunkId": c.chunk_id,
                "excerpt": c.text[:260] + ("…" if len(c.text) > 260 else ""),
            }
        )
    return citations


@router.post("")
def chat(
    body: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Research Mentor. Requires authentication and only ever reads the caller's own papers.
    Order of operations: (1) backend research-intent gate, (2) retrieval over the caller's papers,
    (3) grounded generation. Out-of-scope and unclear messages never reach retrieval or the model.
    """
    user_id = current_user["id"]
    _check_rate_limit(user_id)

    message = body.message.strip()
    history = _clean_history(body.history)

    result = intent.classify_intent(message, previous_category=_previous_category(history))
    if result.category == intent.OUT_OF_SCOPE:
        return _reply(result.category, intent.REFUSAL_MESSAGE, "refused")
    if result.category == intent.UNCLEAR:
        return _reply(result.category, intent.CLARIFY_MESSAGE, "clarify")

    papers = _owned_papers(user_id, body.paper_ids)
    truncated = len(papers) > MAX_PAPERS_PER_QUESTION
    papers = papers[:MAX_PAPERS_PER_QUESTION]

    # Papers explicitly selected but none usable (not found, not the caller's, or no stored PDF):
    # say so rather than quietly answering from general knowledge.
    if not papers and (result.category in PAPER_GROUNDED or body.paper_ids):
        return _reply(result.category, NO_PAPERS_MESSAGE, "no_papers")

    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="The Research Mentor's language model is not configured on this server.")

    searched: List[Dict[str, Any]] = []
    unavailable: List[Dict[str, Any]] = []
    chunks: List[paper_index.Chunk] = []
    try:
        for paper in papers:
            state = paper_index.ensure_paper_indexed(paper["id"], paper["path"])
            if state["status"] == paper_index.STATUS_READY:
                searched.append({"id": paper["id"], "title": paper["title"]})
            else:
                unavailable.append({"id": paper["id"], "title": paper["title"], "reason": state["detail"]})
        if searched:
            per_paper = 4 if len(searched) == 1 else 3
            found = paper_index.search(
                message, searched, per_paper_k=per_paper, total_k=8, section_hints=_section_hints(message)
            )
            profile = embeddings.profile()
            chunks = [c for c in found if c.score >= profile.min_relevance]
            # Specific topics in the question (beyond generic words like "methodology") must be
            # supported by the papers; otherwise the retrieved chunks are about something else.
            terms = topic.topic_terms(message)
            if chunks and terms:
                corpus, semantic = paper_index.topic_support_inputs(" ".join(terms), searched)
                if not topic.is_supported(terms, corpus, semantic, profile.topic_semantic_min):
                    chunks = []
    except paper_index.EmbeddingsUnavailable as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

    evidence = {
        "papersSearched": searched,
        "papersUnavailable": unavailable,
        "paperSetTruncated": truncated,
    }

    if result.category in PAPER_GROUNDED and not chunks:
        if not searched and unavailable:
            reasons = "; ".join(f'"{u["title"]}": {u["reason"]}' for u in unavailable)
            return _reply(
                result.category,
                f"I couldn't read the text of your selected paper(s), so I can't analyze them. {reasons}",
                "insufficient_evidence",
                evidence=evidence,
            )
        return _reply(result.category, INSUFFICIENT_EVIDENCE_MESSAGE, "insufficient_evidence", evidence=evidence)

    try:
        answer = llm.generate_answer(
            message,
            chunks,
            history,
            [f'"{u["title"]}" ({u["reason"]})' for u in unavailable],
        )
    except llm.LlmUnavailable as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception:
        logger.exception("Research Mentor generation failed")
        raise HTTPException(status_code=500, detail="Something went wrong generating an answer. Please try again.")

    # Backstop: the model applies the same scope rules and signals a refusal with a single token.
    if answer.strip().strip(".").upper() == llm.OUT_OF_SCOPE_TOKEN:
        return _reply(intent.OUT_OF_SCOPE, intent.REFUSAL_MESSAGE, "refused")

    return _reply(
        result.category,
        answer,
        "answered",
        citations=_citations_used(answer, chunks),
        evidence=evidence,
        model=llm.used_model(),
    )
