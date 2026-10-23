"""
Cached self-check of the Research Mentor's live Gemini connection, for `/api/health?deep=true`.

One tiny generation and one tiny embedding, at most once per TTL regardless of how often it is
requested, so a public endpoint cannot be used to burn quota. The result contains only pass/fail
and a failure *kind* (for example "model_unavailable"): never keys, model names, paths or messages.
"""
import threading
import time
from typing import Any, Dict, Optional

from backend.chat import embeddings, gemini_errors, llm

TTL_SECONDS = 600

_lock = threading.Lock()
_cached: Optional[Dict[str, Any]] = None
_cached_at = 0.0


def _generation() -> Dict[str, Any]:
    from google.genai import types

    model = llm.model_name()
    try:
        response = llm._get_client(llm._api_key()).models.generate_content(
            model=model,
            contents="Reply with the single word: ok",
            config=types.GenerateContentConfig(
                system_instruction="You are a connectivity test. Answer with one short word.",
                temperature=0.2,
                max_output_tokens=256,
            ),
        )
    except Exception as exc:  # noqa: BLE001 - classified, logged by to_unavailable
        failure = llm.to_unavailable(exc, model)
        return {"ok": False, "kind": failure.kind}
    try:
        llm.extract_text(response, model)
    except llm.LlmUnavailable as exc:
        # The call itself worked (for example the budget went to hidden reasoning): the model is reachable.
        return {"ok": True, "kind": exc.kind}
    return {"ok": True, "kind": "ok"}


def _embeddings() -> Dict[str, Any]:
    try:
        embeddings.embed_query("connectivity test")
    except embeddings.EmbeddingsUnavailable:
        return {"ok": False, "kind": "embeddings_unavailable"}
    except Exception:  # noqa: BLE001
        return {"ok": False, "kind": gemini_errors.UNEXPECTED}
    return {"ok": True, "kind": "ok"}


def run(force: bool = False) -> Dict[str, Any]:
    """Returns the cached result, refreshing it at most once per TTL (the lock also serialises refreshes)."""
    global _cached, _cached_at
    with _lock:
        now = time.monotonic()
        if _cached is None or force or now - _cached_at > TTL_SECONDS:
            _cached = {
                "generation": _generation(),
                "embeddings": _embeddings(),
                "ageSeconds": 0,
            }
            _cached_at = time.monotonic()
        return {**_cached, "ageSeconds": int(time.monotonic() - _cached_at)}


def reset() -> None:
    global _cached, _cached_at
    with _lock:
        _cached, _cached_at = None, 0.0
