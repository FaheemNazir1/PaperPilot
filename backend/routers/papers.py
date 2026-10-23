import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from backend.auth.firebase_auth import get_current_user, get_optional_current_user
from backend.db.database import (
    delete_paper,
    get_all_papers,
    get_owned_file_path,
    get_paper,
    get_paper_sections,
    save_paper,
    _fetch_sections_by_paper_id,
)
from backend.services.pdf_extractor import extract_pdf_content, read_basic_metadata
from backend.services.text_cleaner import clean_text_pipeline
from backend.services.section_detector import detect_title_and_authors, extract_key_elements, segment_sections

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["papers"])

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "uploads"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Per-file upload limit, configurable via PAPERPILOT_MAX_UPLOAD_MB (default 25 MB).
MAX_UPLOAD_MB = float(os.getenv("PAPERPILOT_MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
_READ_CHUNK = 1024 * 1024


@router.get("", response_model=List[Dict[str, Any]])
def list_papers(
    include_demo: bool = Query(False, description="Include public benchmark/demo papers in results"),
    search: Optional[str] = Query(None, description="Search term for title/abstract/authors"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Retrieves papers with strict user ownership isolation:
    - Authenticated user without include_demo -> ONLY their own private papers.
    - Authenticated user with include_demo=true -> their papers PLUS clearly marked demo papers.
    - Unauthenticated request -> public benchmark/demo papers only.
    """
    user_id = current_user["id"] if current_user else None
    return get_all_papers(
        user_id=user_id,
        include_demo=include_demo,
        search=search,
        category=category,
    )


@router.get("/{paper_id}")
def get_paper_by_id(
    paper_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Retrieves a single paper with its sections, original_text, and cleaned_text.
    Strictly enforces ownership: private papers are only accessible to their owner.
    Unauthorized requests return 404 Not Found to prevent leaking paper existence.
    """
    user_id = current_user["id"] if current_user else None
    paper = get_paper(paper_id, user_id=user_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.get("/{paper_id}/sections", response_model=List[Dict[str, Any]])
def get_sections(
    paper_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Retrieves parsed structured sections for a paper.
    Enforces user ownership: private paper sections are only accessible to their owner.
    """
    user_id = current_user["id"] if current_user else None
    sections = get_paper_sections(paper_id, user_id=user_id)
    if not sections:
        paper = get_paper(paper_id, user_id=user_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
    return sections


@router.delete("/{paper_id}")
def remove_paper(
    paper_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Deletes paper from database.
    Requires authentication. Only allows deleting papers owned by the authenticated user.
    """
    stored_file = get_owned_file_path(paper_id, current_user["id"])
    success = delete_paper(paper_id, user_id=current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found or unauthorized")
    if stored_file:
        try:
            Path(stored_file).unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove stored file for deleted paper %s", paper_id)
    return {"message": "Paper successfully deleted", "id": paper_id}


def _format_size(num_bytes: int) -> str:
    if num_bytes < 1024 * 1024:
        return f"{max(1, round(num_bytes / 1024))} KB"
    return f"{num_bytes / (1024 * 1024):.1f} MB"


def _error_item(name: str, message: str) -> Dict[str, Any]:
    return {"id": f"up-{uuid.uuid4().hex[:8]}", "name": name, "status": "error", "error": message}


def _store_upload(file: UploadFile, destination: Path) -> int:
    """
    Streams the upload to destination, enforcing the size limit and the %PDF header.
    Returns the byte count. Raises ValueError with a user-facing message on rejection;
    the partial file is removed in that case.
    """
    total = 0
    try:
        with destination.open("wb") as buffer:
            while True:
                chunk = file.file.read(_READ_CHUNK)
                if not chunk:
                    break
                if total == 0 and not chunk.startswith(b"%PDF-"):
                    raise ValueError("This file is not a valid PDF document.")
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise ValueError(f"File is larger than the {MAX_UPLOAD_MB:g} MB limit.")
                buffer.write(chunk)
        if total == 0:
            raise ValueError("The file is empty.")
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return total


@router.post("/upload")
async def upload_pdf_papers(
    files: List[UploadFile] = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Stores one or more PDFs for the authenticated user and records them in SQLite.

    This is a storage operation only: no text extraction, section detection, embeddings
    or analysis runs here, and uploaded papers are marked status="Uploaded". Ownership
    always comes from the verified Firebase token, never from the request body.
    """
    user_id = current_user["id"]
    user_storage_dir = STORAGE_DIR / str(user_id)
    user_storage_dir.mkdir(parents=True, exist_ok=True)

    uploaded_items: List[Dict[str, Any]] = []
    saved_papers: List[Dict[str, Any]] = []

    for file in files:
        display_name = Path(file.filename or "").name
        if not display_name or not display_name.lower().endswith(".pdf"):
            uploaded_items.append(_error_item(display_name or "unknown", "Only PDF documents are supported."))
            continue

        paper_id = f"paper-{uuid.uuid4().hex[:8]}"
        safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(display_name).stem)[:80] or "paper"
        file_path = user_storage_dir / f"{paper_id}_{safe_stem}.pdf"

        try:
            size_bytes = _store_upload(file, file_path)
        except ValueError as e:
            uploaded_items.append(_error_item(display_name, str(e)))
            continue
        except Exception:
            logger.exception("Failed to store upload %s", display_name)
            uploaded_items.append(_error_item(display_name, "The server could not save this file. Please try again."))
            continue

        # Basic metadata only (page count, embedded title). Failure means the PDF is unreadable.
        try:
            meta = read_basic_metadata(str(file_path))
        except Exception:
            file_path.unlink(missing_ok=True)
            uploaded_items.append(_error_item(display_name, "This PDF could not be opened. It may be corrupted or encrypted."))
            continue

        now = datetime.now(timezone.utc)
        title = meta["meta_title"] or Path(display_name).stem.replace("_", " ").strip() or display_name
        authors = [a.strip() for a in re.split(r"[;,]", meta["meta_author"]) if a.strip()]

        paper_data = {
            "id": paper_id,
            "title": title,
            "authors": authors,
            "year": now.year,
            "venue": "Uploaded PDF",
            "status": "Uploaded",
            "pdfSize": _format_size(size_bytes),
            "addedAt": now.strftime("%Y-%m-%d"),
            "file_path": str(file_path),
            "originalFilename": display_name,
            "sizeBytes": size_bytes,
            "pageCount": meta["page_count"],
            "uploadedAt": now.isoformat(),
        }

        try:
            saved = save_paper(paper_data, [], user_id=user_id, is_demo=False)
        except Exception:
            logger.exception("Failed to record upload %s", display_name)
            file_path.unlink(missing_ok=True)
            uploaded_items.append(_error_item(display_name, "The paper could not be saved. Please try again."))
            continue

        saved_papers.append(saved)
        uploaded_items.append(
            {
                "id": f"up-{paper_id}",
                "name": display_name,
                "size": _format_size(size_bytes),
                "status": "uploaded",
                "pages": meta["page_count"],
                "paperId": paper_id,
                "title": title,
            }
        )

    return {
        "success": any(i["status"] == "uploaded" for i in uploaded_items),
        "maxUploadMb": MAX_UPLOAD_MB,
        "items": uploaded_items,
        "papers": saved_papers,
    }


# ---------------------------------------------------------------------------
# Text extraction / analysis endpoint
# ---------------------------------------------------------------------------

class AnalyzeResult(BaseModel):
    paper_id: str
    title: str
    abstract: str
    status: str


@router.post("/{paper_id}/analyze", response_model=AnalyzeResult)
def analyze_paper(
    paper_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Runs PyMuPDF text extraction, cleaning, section detection, and abstract
    extraction on a stored PDF.  Updates the paper record in SQLite.

    Only works on PDFs owned by the authenticated user (not demo papers).
    Returns the extracted abstract so the frontend can let the user edit it.

    Raises:
        404  – paper not found or not owned by the caller
        422  – PDF file missing from disk
        500  – extraction failed (scanned/image-only PDF, corrupt file, etc.)
    """
    user_id = current_user["id"]
    paper = get_paper(paper_id, user_id=user_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    file_path = get_owned_file_path(paper_id, user_id)
    if not file_path or not Path(file_path).exists():
        raise HTTPException(
            status_code=422,
            detail="PDF file not found on disk. The paper record exists but the file is missing.",
        )

    # ----- extraction -----
    try:
        extracted = extract_pdf_content(file_path)
    except Exception as exc:
        logger.exception("PDF extraction failed for paper %s", paper_id)
        raise HTTPException(
            status_code=500,
            detail=f"Could not extract text from this PDF: {exc}. "
                   "It may be scanned, image-only, or corrupt.",
        )

    original_text: str = extracted["original_text"]
    pages = extracted["pages"]
    blocks = extracted["blocks"]
    meta_title: str = extracted["meta_title"]

    # Check for image-only / scanned PDFs (no extractable text)
    total_chars = sum(len(p.get("raw_text", "")) for p in pages)
    if total_chars < 100:
        raise HTTPException(
            status_code=422,
            detail=(
                "This PDF appears to be scanned or image-only (fewer than 100 characters of "
                "extractable text). PaperPilot cannot process scanned documents."
            ),
        )

    cleaned_text = clean_text_pipeline(original_text, pages)

    # Title / author refinement
    detected_title, detected_authors = detect_title_and_authors(blocks, meta_title=meta_title)
    best_title = detected_title if len(detected_title) > 4 else paper.get("title", "Untitled")

    sections = segment_sections(cleaned_text, blocks, paper_id)
    key_elements = extract_key_elements(sections, cleaned_text)

    abstract = key_elements.get("abstract", "").strip()
    if not abstract or len(abstract) < 40:
        # fallback: first substantive paragraph
        paras = [p.strip() for p in cleaned_text.split("\n\n") if len(p.strip()) > 80]
        abstract = paras[0][:1500] if paras else "Abstract could not be extracted."

    # Persist enriched data
    updated_data = {
        **paper,
        "title": best_title,
        "authors": detected_authors or paper.get("authors", []),
        "abstract": abstract,
        "summary": abstract[:300],
        "methodology": key_elements.get("methodology", ""),
        "keyFindings": key_elements.get("keyFindings", []),
        "limitations": key_elements.get("limitations", []),
        "dataset": key_elements.get("dataset", "N/A"),
        "model": key_elements.get("model", "N/A"),
        "status": "Indexed",
        "original_text": original_text,
        "cleaned_text": cleaned_text,
        "file_path": file_path,
    }

    save_paper(updated_data, sections, user_id=user_id, is_demo=False)

    return AnalyzeResult(
        paper_id=paper_id,
        title=best_title,
        abstract=abstract,
        status="Indexed",
    )


@router.patch("/{paper_id}/abstract")
def update_abstract(
    paper_id: str,
    body: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Lets the user correct the extracted abstract before generating a review.
    Only updates the abstract field; all other paper data is untouched.
    """
    user_id = current_user["id"]
    paper = get_paper(paper_id, user_id=user_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    new_abstract = (body.get("abstract") or "").strip()
    if len(new_abstract) < 30:
        raise HTTPException(status_code=422, detail="Abstract must be at least 30 characters.")
    if len(new_abstract) > 4000:
        raise HTTPException(status_code=422, detail="Abstract must not exceed 4000 characters.")

    paper["abstract"] = new_abstract
    existing_sections = _fetch_sections_by_paper_id(paper_id)
    save_paper(paper, existing_sections, user_id=user_id, is_demo=False)
    return {"paper_id": paper_id, "abstract": new_abstract}
