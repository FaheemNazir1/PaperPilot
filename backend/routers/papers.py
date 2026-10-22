import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from backend.auth.firebase_auth import get_current_user, get_optional_current_user
from backend.db.database import (
    DATA_DIR,
    delete_paper,
    get_all_papers,
    get_owned_file_path,
    get_paper,
    get_paper_sections,
    save_paper,
)
from backend.services import summarizer
from backend.services.pdf_extractor import read_basic_metadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["papers"])

STORAGE_DIR = DATA_DIR / "storage" / "uploads"
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


@router.get("/{paper_id}/pdf")
def get_paper_pdf(
    paper_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Streams the original uploaded PDF to its owner. Requires authentication; other users'
    papers, demo papers and papers with no stored file all return 404. The stored path is
    looked up from the database by ownership and never taken from the request.
    """
    stored_file = get_owned_file_path(paper_id, current_user["id"])
    if not stored_file:
        raise HTTPException(status_code=404, detail="Paper not found")
    path = Path(stored_file)
    try:
        inside_storage = path.resolve().is_relative_to(STORAGE_DIR.resolve())
    except OSError:
        inside_storage = False
    if not inside_storage or not path.is_file():
        raise HTTPException(status_code=404, detail="The original PDF is no longer available on the server.")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"{paper_id}.pdf",
        content_disposition_type="inline",
        headers={"Cache-Control": "private, no-store"},
    )


@router.post("/{paper_id}/summary")
def summarize_paper(
    paper_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generates a summary of one of the caller's own uploaded PDFs with the fine-tuned T5-small model.
    Requires authentication; demo papers and other users' papers return 404. Nothing is stored.
    Only the first 512 tokens of the paper are read (see inputTokens/totalTokens/truncated).
    """
    stored_file = get_owned_file_path(paper_id, current_user["id"])
    if not stored_file or not Path(stored_file).is_file():
        raise HTTPException(status_code=404, detail="Paper not found")
    try:
        return summarizer.summarize_pdf(stored_file)
    except summarizer.SummarizerUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except summarizer.UnreadablePdf as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Summarization failed for paper %s", paper_id)
        raise HTTPException(status_code=500, detail="Summary generation failed. Please try again.")


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
