"""
POST /api/v1/review/related-work

Accepts either:
  - raw abstracts (query_abstract + reference_abstracts strings), or
  - paper IDs from the user's library (query_paper_id + reference_paper_ids)

Returns a model-generated related-work section.

Authentication:  requires a valid Firebase Bearer token (get_current_user).
Model loading:   handled by llm_service — the model is loaded once at first
                 request, not on every call.

IMPORTANT: The generated text is produced by a fine-tuned language model.
It is NOT factually verified; citations and research claims should be
reviewed by the user before inclusion in any publication.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator

from backend.auth.firebase_auth import get_current_user
from backend.db.database import get_paper
from backend.services.llm_service import (
    MAX_ABSTRACTS,
    MAX_ABSTRACT_CHARS,
    MAX_NEW_TOKENS,
    generate_related_work,
    get_load_error,
    is_model_available,
)
from backend.services.output_checker import check_output_quality, ground_output

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/review", tags=["review"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class RelatedWorkRequest(BaseModel):
    # --- Option A: raw abstracts ---
    query_abstract: Optional[str] = Field(
        None,
        min_length=50,
        max_length=MAX_ABSTRACT_CHARS,
        description="Abstract of the query paper (use this OR query_paper_id).",
    )
    reference_abstracts: Optional[List[str]] = Field(
        None,
        description="Abstracts of the reference papers (use with query_abstract).",
    )

    # --- Option B: paper IDs from the library ---
    query_paper_id: Optional[str] = Field(
        None,
        description="ID of the query paper in the library (use this OR query_abstract).",
    )
    reference_paper_ids: Optional[List[str]] = Field(
        None,
        description="IDs of the reference papers in the library (2–4 recommended, max 10).",
    )

    max_new_tokens: int = Field(
        default=MAX_NEW_TOKENS,
        ge=64,
        le=1024,
        description="Maximum number of tokens the model may generate.",
    )

    @model_validator(mode="after")
    def validate_input_mode(self) -> "RelatedWorkRequest":
        has_raw = bool(self.query_abstract)
        has_ids = bool(self.query_paper_id)
        if not has_raw and not has_ids:
            raise ValueError("Provide either query_abstract or query_paper_id.")
        if has_raw and has_ids:
            raise ValueError("Provide query_abstract OR query_paper_id, not both.")
        if has_raw and not self.reference_abstracts:
            raise ValueError("reference_abstracts is required when using query_abstract.")
        if has_ids and not self.reference_paper_ids:
            raise ValueError("reference_paper_ids is required when using query_paper_id.")
        return self

    @field_validator("reference_abstracts")
    @classmethod
    def validate_references(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        if len(v) > MAX_ABSTRACTS:
            raise ValueError(f"At most {MAX_ABSTRACTS} reference abstracts are accepted.")
        cleaned = [r.strip() for r in v if r.strip()]
        if not cleaned:
            raise ValueError("At least one non-empty reference abstract is required.")
        short = [r for r in cleaned if len(r) < 20]
        if short:
            raise ValueError(
                f"{len(short)} reference abstract(s) are too short (< 20 chars). "
                "Provide meaningful abstracts."
            )
        return cleaned

    @field_validator("reference_paper_ids")
    @classmethod
    def validate_ref_ids(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        if len(v) > MAX_ABSTRACTS:
            raise ValueError(f"At most {MAX_ABSTRACTS} reference paper IDs are accepted.")
        if len(v) < 1:
            raise ValueError("At least one reference paper ID is required.")
        return v


class OutputQualityFlags(BaseModel):
    repeated_phrases: bool = False
    citation_spam: bool = False
    unsupported_citations: bool = False
    truncated: bool = False
    warnings: List[str] = []


class RelatedWorkResponse(BaseModel):
    related_work: str
    model: str = "Qwen/Qwen2.5-0.5B-Instruct + PaperPilot LoRA"
    tokens_requested: int
    quality: OutputQualityFlags
    # Maps citation index string ("1", "2"…) to paper metadata for each [N] in the text.
    # Only contains citations that are grounded to a real supplied paper.
    citation_map: Dict[str, Any] = {}
    grounding: Dict[str, Any] = {}
    disclaimer: str = (
        "This text was generated by a fine-tuned language model. "
        "It has NOT been verified for factual accuracy, citation correctness, "
        "or research claim validity. Review all content before use."
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/related-work",
    response_model=RelatedWorkResponse,
    summary="Generate a related-work section from supplied abstracts or library paper IDs",
    responses={
        503: {"description": "Model not available — adapter files missing or failed to load"},
        500: {"description": "Generation error"},
    },
)
def generate_related_work_endpoint(
    body: RelatedWorkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> RelatedWorkResponse:
    """
    Generates a coherent related-work section by synthesising the supplied
    research-paper abstracts.  Requires authentication.

    Accepts either raw abstract strings or paper IDs from the authenticated
    user's library (or demo papers).  When paper IDs are supplied the
    server looks up the stored abstract; if the abstract is empty the paper
    must be analyzed first via POST /papers/{id}/analyze.

    The model does NOT have access to external databases and cannot verify
    whether the papers it references actually exist or whether the claims it
    makes are accurate.
    """
    # Auth is enforced by the Depends(get_current_user) above.
    # Check model availability after auth so unauthenticated calls still get 401.
    if not is_model_available():
        err = get_load_error()
        detail = (
            "The LoRA adapter files are not present on this server. "
            "Extract paperpilot_lora_adapter.zip to backend/models/paperpilot_lora/ "
            "and restart the backend."
        )
        if err:
            detail += f" Detail: {err}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    user_id: int = current_user["id"]

    # Resolve abstracts — either supplied directly or looked up from paper IDs
    ref_paper_ids: List[str] = []
    ref_paper_titles: List[str] = []

    if body.query_paper_id:
        query_abstract, ref_abstracts, ref_paper_ids, ref_paper_titles = _resolve_from_ids(
            body.query_paper_id, body.reference_paper_ids or [], user_id
        )
    else:
        query_abstract = body.query_abstract  # type: ignore[assignment]
        ref_abstracts = body.reference_abstracts  # type: ignore[assignment]
        # Raw-abstract path has no paper IDs; generate sequential placeholders
        # so ground_output can validate citation range without real IDs.
        ref_paper_ids = [f"ref-{i+1}" for i in range(len(ref_abstracts))]

    # Validate: all abstracts must be non-empty and substantive
    empty = [i + 1 for i, a in enumerate(ref_abstracts) if not a or len(a.strip()) < 30]
    if empty:
        raise HTTPException(
            status_code=422,
            detail=f"Reference abstract(s) at position(s) {empty} are empty or too short. "
                   "Each reference must have at least 30 characters of content.",
        )

    logger.info(
        "Generating related-work: user=%s query_len=%d refs=%d",
        user_id, len(query_abstract), len(ref_abstracts),
    )

    try:
        raw_text = generate_related_work(
            query_abstract=query_abstract,
            reference_abstracts=ref_abstracts,
            max_new_tokens=body.max_new_tokens,
            reference_titles=ref_paper_titles if ref_paper_titles else None,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Generation failed for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Related-work generation failed. Check server logs for details.",
        )

    # Reject empty / placeholder-only output
    stripped_raw = raw_text.strip()
    if not stripped_raw or len(stripped_raw) < 40:
        raise HTTPException(
            status_code=500,
            detail="Model returned an empty or placeholder-only response. "
                   "Try increasing max_new_tokens or check that the abstracts are substantive.",
        )

    logger.info("Raw model output: %d chars, %d tokens", len(raw_text), body.max_new_tokens)

    # Ground the output: map citations to real paper IDs, strip invented ones,
    # fix POV drift, deduplicate sentences.
    grounded_text, grounding_meta = ground_output(
        raw_text,
        paper_ids=ref_paper_ids,
        paper_titles=ref_paper_titles if ref_paper_titles else None,
        query_abstract=query_abstract,
        reference_abstracts=ref_abstracts,
    )

    # Build a References section from real metadata (only for the ID-based path)
    references_section = _build_references_section(
        grounding_meta["citation_map"], ref_paper_ids, ref_paper_titles
    )
    if references_section:
        grounded_text = grounded_text.rstrip() + "\n\n" + references_section

    quality = check_output_quality(grounded_text, num_reference_papers=len(ref_abstracts))

    return RelatedWorkResponse(
        related_work=grounded_text,
        tokens_requested=body.max_new_tokens,
        quality=OutputQualityFlags(**quality),
        citation_map=grounding_meta["citation_map"],
        grounding={
            "removed_sentence_count": grounding_meta["removed_sentence_count"],
            "pov_fixes_applied": grounding_meta["pov_fixes_applied"],
            "insufficient_evidence": grounding_meta["insufficient_evidence"],
            "used_fallback_synthesis": grounding_meta.get("used_fallback_synthesis", False),
        },
    )


def _build_references_section(
    citation_map: Dict[str, Any],
    ref_paper_ids: List[str],
    ref_paper_titles: List[str],
) -> str:
    """
    Builds a plain-text References section from citations that survived grounding.
    Only called when the paper-ID path was used (so we have real titles).
    Returns an empty string if no titles are available.
    """
    if not ref_paper_titles or not citation_map:
        return ""

    lines = ["References"]
    for str_n, entry in sorted(citation_map.items(), key=lambda kv: int(kv[0])):
        title = entry.get("title", "")
        if title:
            lines.append(f"[{str_n}] {title}.")
    return "\n".join(lines) if len(lines) > 1 else ""


def _resolve_from_ids(
    query_id: str,
    ref_ids: List[str],
    user_id: int,
) -> tuple[str, List[str], List[str], List[str]]:
    """
    Looks up papers by ID (owned by user or demo), extracts their abstract and title.
    Raises HTTPException if any paper is not found, not accessible, or has no abstract.

    Returns (query_abstract, ref_abstracts, ref_paper_ids, ref_paper_titles).
    """
    def _fetch(paper_id: str, label: str) -> tuple[str, str]:
        """Returns (abstract, title) for a paper."""
        paper = get_paper(paper_id, user_id=user_id)
        if not paper:
            raise HTTPException(
                status_code=404,
                detail=f"{label} paper '{paper_id}' not found. "
                       "Upload and analyze it before generating a review.",
            )
        abstract = (paper.get("abstract") or "").strip()
        if len(abstract) < 30:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"{label} paper '{paper.get('title', paper_id)}' has no usable abstract. "
                    "Run POST /papers/{id}/analyze first, or edit the abstract manually."
                ),
            )
        title = paper.get("title", paper_id)
        return abstract[:MAX_ABSTRACT_CHARS], title

    query_abstract, _ = _fetch(query_id, "Query")

    if len(ref_ids) > MAX_ABSTRACTS:
        raise HTTPException(
            status_code=422,
            detail=f"At most {MAX_ABSTRACTS} reference papers are accepted.",
        )
    if len(ref_ids) < 1:
        raise HTTPException(status_code=422, detail="At least one reference paper ID is required.")

    ref_abstracts: List[str] = []
    ref_titles: List[str] = []
    for i, rid in enumerate(ref_ids):
        abstract, title = _fetch(rid, f"Reference [{i+1}]")
        ref_abstracts.append(abstract)
        ref_titles.append(title)

    return query_abstract, ref_abstracts, ref_ids, ref_titles


@router.get("/status", summary="Check model availability")
def model_status() -> Dict[str, Any]:
    """Returns whether the LoRA adapter is present and ready to serve requests."""
    from backend.services.llm_service import LORA_PATH  # noqa: F401
    available = is_model_available()
    err = get_load_error()
    return {
        "model_available": available,
        "adapter_path": str(LORA_PATH),
        "load_error": err,
    }
