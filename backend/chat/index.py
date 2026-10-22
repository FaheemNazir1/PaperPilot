"""
Per-user paper index for retrieval: page-aware chunks plus embeddings, stored in SQLite.

- Chunks come from the user's own stored PDFs (PyMuPDF text, page by page), so every chunk
  carries real page numbers and a detected section name.
- Embeddings are computed once per paper and persisted; a paper is re-indexed only when its
  file signature (size, mtime, chunker version, embedding backend) changes. Deleting a paper cascades to its chunks.
- Only papers owned by the requesting user are ever indexed or searched.
"""
import logging
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Collection, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pymupdf

from backend.chat import embeddings
from backend.chat.embeddings import EmbeddingsUnavailable  # re-exported for callers
from backend.db.database import get_db_connection
from backend.services.section_detector import classify_heading
from backend.services.text_cleaner import normalize_ligatures, remove_dehyphenation

logger = logging.getLogger(__name__)

CHUNKER_VERSION = "v1"
CHUNK_WORDS = 220
CHUNK_OVERLAP_WORDS = 40
MAX_PAGES_INDEXED = 120
# Chunks from these sections are kept out of retrieval; they add noise, not evidence.
EXCLUDED_SECTIONS = {"references"}
SECTION_SEPARATOR = "|"

STATUS_READY = "ready"
STATUS_NO_TEXT = "no_text"
STATUS_FAILED = "failed"


@dataclass
class Chunk:
    chunk_id: str
    paper_id: str
    paper_title: str
    section: str
    page_start: int
    page_end: int
    text: str
    score: float = 0.0


# ---------------------------------------------------------------------------
# Embeddings (backend chosen in backend/chat/embeddings.py)
# ---------------------------------------------------------------------------
def embed_texts(texts: Sequence[str]) -> np.ndarray:
    """L2-normalised embeddings of document chunks (a dot product is cosine similarity)."""
    return embeddings.embed_documents(texts)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------
_WORD_SPLIT = re.compile(r"\S+")


def _clean_page_text(text: str) -> str:
    return remove_dehyphenation(normalize_ligatures(text or ""))


def chunk_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Splits a PDF into overlapping word-window chunks that keep page numbers and section names.
    Returns [] when the PDF has no extractable text (for example a scanned image).
    """
    doc = pymupdf.open(stream=Path(pdf_path).read_bytes(), filetype="pdf")
    words: List[Tuple[str, int, str]] = []  # (word, page_number, section)
    try:
        section = "body"
        for page_index in range(min(len(doc), MAX_PAGES_INDEXED)):
            page_no = page_index + 1
            text = _clean_page_text(doc[page_index].get_text("text"))
            for line in text.splitlines():
                stripped = line.strip()
                if not stripped:
                    continue
                if len(stripped) <= 80:
                    detected = classify_heading(stripped)
                    if detected:
                        section = detected
                        continue  # a heading line is a label, not body text
                for match in _WORD_SPLIT.finditer(stripped):
                    words.append((match.group(0), page_no, section))
    finally:
        doc.close()

    chunks: List[Dict[str, Any]] = []
    step = CHUNK_WORDS - CHUNK_OVERLAP_WORDS
    for start in range(0, len(words), step):
        window = words[start:start + CHUNK_WORDS]
        if len(window) < 25 and chunks:
            break  # a tiny tail adds nothing over the previous overlap
        # A chunk can straddle headings, so record every section it covers (in order).
        covered = list(dict.fromkeys(w[2] for w in window))
        if all(name in EXCLUDED_SECTIONS for name in covered):
            continue
        section_name = SECTION_SEPARATOR.join(n for n in covered if n not in EXCLUDED_SECTIONS)
        chunks.append(
            {
                "section": section_name,
                "page_start": window[0][1],
                "page_end": window[-1][1],
                "text": " ".join(w[0] for w in window),
            }
        )
        if start + CHUNK_WORDS >= len(words):
            break
    return chunks


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------
def _signature(path: Path) -> str:
    stat = path.stat()
    return f"{CHUNKER_VERSION}:{embeddings.profile().id}:{stat.st_size}:{stat.st_mtime_ns}"


def ensure_paper_indexed(paper_id: str, pdf_path: Optional[str]) -> Dict[str, Any]:
    """
    Makes sure a paper's chunks are indexed and current. Returns {"status", "chunk_count", "detail"}.
    Does nothing (no embedding work) when the stored signature already matches the file.
    """
    path = Path(pdf_path) if pdf_path else None
    if not path or not path.is_file():
        return {"status": STATUS_FAILED, "chunk_count": 0, "detail": "The original PDF is no longer on the server."}

    signature = _signature(path)
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT signature, status, chunk_count, detail FROM paper_index WHERE paper_id = ?", (paper_id,)
        ).fetchone()
        if row and row["signature"] == signature:
            return {"status": row["status"], "chunk_count": row["chunk_count"], "detail": row["detail"]}

    status, detail, rows = STATUS_READY, None, []
    try:
        chunks = chunk_pdf(str(path))
        if not chunks:
            status, detail = STATUS_NO_TEXT, "No readable text was found (the PDF may be a scanned image)."
        else:
            vectors = embed_texts([c["text"] for c in chunks])
            for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
                rows.append(
                    (
                        f"chk-{uuid.uuid4().hex[:12]}", paper_id, i, chunk["section"],
                        chunk["page_start"], chunk["page_end"], chunk["text"], vector.tobytes(),
                    )
                )
    except EmbeddingsUnavailable:
        raise
    except Exception:
        logger.exception("Indexing failed for paper %s", paper_id)
        status, detail = STATUS_FAILED, "The PDF could not be read for analysis."

    with get_db_connection() as conn:
        conn.execute("DELETE FROM paper_chunks WHERE paper_id = ?", (paper_id,))
        if rows:
            conn.executemany(
                "INSERT INTO paper_chunks (id, paper_id, chunk_index, section, page_start, page_end, text, embedding) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
        conn.execute(
            "INSERT INTO paper_index (paper_id, signature, status, chunk_count, detail) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(paper_id) DO UPDATE SET signature = excluded.signature, status = excluded.status, "
            "chunk_count = excluded.chunk_count, detail = excluded.detail",
            (paper_id, signature, status, len(rows), detail),
        )
        conn.commit()
    return {"status": status, "chunk_count": len(rows), "detail": detail}


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
def _load_paper_chunks(paper_id: str, title: str) -> Tuple[List[Chunk], Optional[np.ndarray]]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, section, page_start, page_end, text, embedding FROM paper_chunks "
            "WHERE paper_id = ? ORDER BY chunk_index",
            (paper_id,),
        ).fetchall()
    if not rows:
        return [], None
    chunks = [Chunk(r["id"], paper_id, title, r["section"], r["page_start"], r["page_end"], r["text"]) for r in rows]
    matrix = np.vstack([np.frombuffer(r["embedding"], dtype=np.float32) for r in rows])
    return chunks, matrix


def search(
    query: str,
    papers: Sequence[Dict[str, Any]],
    per_paper_k: int,
    total_k: int,
    section_hints: Optional[Collection[str]] = None,
) -> List[Chunk]:
    """
    Cosine-similarity search over the given papers (each {"id", "title"}); all must already be
    indexed. Takes the top per_paper_k chunks from each paper so comparisons see every paper,
    then keeps the best total_k overall. Scores are attached to each chunk.

    Structural questions ("what are the limitations?") barely resemble the text of the section
    they ask about, so chunks whose detected section is in section_hints get the backend's section_boost added.
    """
    query_vec = embeddings.embed_query(query)
    boost = embeddings.profile().section_boost
    hints = set(section_hints or ())
    picked: List[Chunk] = []
    for paper in papers:
        chunks, matrix = _load_paper_chunks(paper["id"], paper["title"])
        if matrix is None:
            continue
        scores = matrix @ query_vec
        if hints:
            scores = scores + np.array(
                    [boost if hints & set(c.section.split(SECTION_SEPARATOR)) else 0.0 for c in chunks],
                    dtype=np.float32,
                )
        for idx in np.argsort(-scores)[:per_paper_k]:
            chunk = chunks[int(idx)]
            chunk.score = float(scores[int(idx)])
            picked.append(chunk)
    picked.sort(key=lambda c: c.score, reverse=True)
    return picked[:total_k]


def topic_support_inputs(topical_phrase: str, papers: Sequence[Dict[str, Any]]) -> Tuple[str, float]:
    """
    For the topic-support check: the lower-cased text of the given (already indexed) papers and the
    best cosine similarity between the topical phrase and any of their chunks.
    """
    phrase_vec = embeddings.embed_query(topical_phrase)
    texts: List[str] = []
    best = 0.0
    for paper in papers:
        chunks, matrix = _load_paper_chunks(paper["id"], paper["title"])
        if matrix is None:
            continue
        texts.extend(c.text for c in chunks)
        best = max(best, float((matrix @ phrase_vec).max()))
    return " ".join(texts).lower(), best
