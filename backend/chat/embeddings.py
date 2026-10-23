"""
Embedding backends for paper retrieval.

- "local":  sentence-transformers all-MiniLM-L6-v2 (needs torch; great for development, too heavy for small hosts).
- "gemini": Gemini embedding API (no torch, so it runs on small hosts such as Render's free tier).

Choose with EMBEDDING_BACKEND=local|gemini. When unset, the local model is used if sentence-transformers
is installed and Gemini embeddings otherwise. Each backend has its own `id` (stored in the index signature,
so switching backends re-indexes papers) and its own similarity thresholds, because cosine scores from
different models are not comparable.
"""
import importlib.util
import logging
import os
import threading
from dataclasses import dataclass
from typing import Any, List, Sequence

import numpy as np

logger = logging.getLogger(__name__)

LOCAL_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
GEMINI_DEFAULT_MODEL = "gemini-embedding-001"
GEMINI_DIMENSIONS = 768
GEMINI_BATCH = 100  # the API accepts up to 100 texts per request


class EmbeddingsUnavailable(Exception):
    """Embeddings cannot be produced right now. `status_code` is the HTTP status to return to the client."""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class Profile:
    """Identity and retrieval thresholds of one embedding backend (cosine similarities are model-specific)."""

    id: str
    min_relevance: float  # a chunk below this is treated as unrelated to the question
    topic_semantic_min: float  # a topical phrase at or above this is "supported" without literal word matches
    section_boost: float  # added to chunks whose section matches what the question names


def backend_name() -> str:
    choice = os.getenv("EMBEDDING_BACKEND", "").strip().lower()
    if choice in ("local", "gemini"):
        return choice
    return "local" if importlib.util.find_spec("sentence_transformers") else "gemini"


def gemini_model() -> str:
    return os.getenv("GEMINI_EMBEDDING_MODEL", "").strip() or GEMINI_DEFAULT_MODEL


def profile() -> Profile:
    if backend_name() == "gemini":
        return Profile(
            id=f"gemini:{gemini_model()}:{GEMINI_DIMENSIONS}",
            # Calibrated on real papers: related questions scored 0.60-0.78 and unrelated 0.49-0.62, so the
            # floor only drops clearly unrelated chunks and the semantic bar is high; literal matching of the
            # question's topic words (backend/chat/topic.py) does the actual separating.
            min_relevance=float(os.getenv("GEMINI_MIN_RELEVANCE", "0.5")),
            topic_semantic_min=float(os.getenv("GEMINI_TOPIC_SEMANTIC_MIN", "0.7")),
            section_boost=0.1,
        )
    return Profile(id=f"local:{LOCAL_MODEL_NAME}", min_relevance=0.225, topic_semantic_min=0.25, section_boost=0.25)


# --------------------------------------------------------------------------- local
_local_lock = threading.Lock()
_local_model: Any = None


def _local() -> Any:
    global _local_model
    with _local_lock:
        if _local_model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                logger.error("sentence-transformers is not installed: %s", exc)
                raise EmbeddingsUnavailable("Paper search is not enabled on this server.") from exc
            try:
                _local_model = SentenceTransformer(LOCAL_MODEL_NAME)
            except Exception as exc:  # noqa: BLE001
                logger.error("Could not load embedding model: %s", exc)
                raise EmbeddingsUnavailable("The paper-search model could not be loaded on this server.") from exc
        return _local_model


def _embed_local(texts: Sequence[str]) -> np.ndarray:
    vectors = _local().encode(list(texts), batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vectors, dtype=np.float32)


# --------------------------------------------------------------------------- gemini
def _embed_gemini(texts: Sequence[str], task_type: str) -> np.ndarray:
    from google.genai import types

    from backend.chat import llm  # imported late: llm imports the index, which imports this module

    key = llm._api_key()
    if not key:
        raise EmbeddingsUnavailable("The Research Mentor's embedding service is not configured on this server.")
    model = gemini_model()
    out: List[List[float]] = []
    for start in range(0, len(texts), GEMINI_BATCH):
        batch = list(texts[start:start + GEMINI_BATCH])
        try:
            response = llm._get_client(key).models.embed_content(
                model=model,
                contents=batch,
                config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=GEMINI_DIMENSIONS),
            )
        except Exception as exc:  # noqa: BLE001 - classified precisely
            failure = llm.to_unavailable(exc, model)
            raise EmbeddingsUnavailable(str(failure), failure.status_code) from exc
        vectors = [list(e.values) for e in (response.embeddings or [])]
        if len(vectors) != len(batch):
            logger.error("Gemini embeddings: expected %s vectors, got %s (model=%s)", len(batch), len(vectors), model)
            raise EmbeddingsUnavailable("The embedding service returned an unexpected response. Please try again.", 502)
        out.extend(vectors)
    matrix = np.asarray(out, dtype=np.float32)
    # Reduced-dimension Gemini embeddings are not unit length; normalise so a dot product is cosine similarity.
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.where(norms == 0, 1, norms)


# --------------------------------------------------------------------------- public API
def embed_documents(texts: Sequence[str]) -> np.ndarray:
    """L2-normalised float32 embeddings of document chunks."""
    if backend_name() == "gemini":
        return _embed_gemini(texts, "RETRIEVAL_DOCUMENT")
    return _embed_local(texts)


def embed_query(text: str) -> np.ndarray:
    """L2-normalised float32 embedding of a question or topical phrase."""
    if backend_name() == "gemini":
        return _embed_gemini([text], "RETRIEVAL_QUERY")[0]
    return _embed_local([text])[0]
