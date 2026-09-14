import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from backend.db.database import (
    delete_paper,
    get_all_papers,
    get_paper,
    get_paper_sections,
    save_paper,
)
from backend.models.schemas import Paper, PaperSection, UploadItem
from backend.services.pdf_extractor import extract_pdf_content
from backend.services.section_detector import (
    detect_title_and_authors,
    extract_key_elements,
    segment_sections,
)
from backend.services.text_cleaner import clean_text_pipeline

router = APIRouter(prefix="/papers", tags=["papers"])

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "uploads"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=List[Dict[str, Any]])
def list_papers(
    search: Optional[str] = Query(None, description="Search term for title/abstract/authors"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """Retrieves all indexed papers with optional query filters."""
    return get_all_papers(search=search, category=category)


@router.get("/{paper_id}")
def get_paper_by_id(paper_id: str):
    """Retrieves single paper with its sections, original_text, and cleaned_text."""
    paper = get_paper(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.get("/{paper_id}/sections", response_model=List[Dict[str, Any]])
def get_sections(paper_id: str):
    """Retrieves parsed structured sections for a paper."""
    sections = get_paper_sections(paper_id)
    if not sections:
        # Check if paper exists
        paper = get_paper(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
    return sections


@router.delete("/{paper_id}")
def remove_paper(paper_id: str):
    """Deletes paper from database."""
    success = delete_paper(paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"message": "Paper successfully deleted", "id": paper_id}


@router.post("/upload")
async def upload_pdf_papers(files: List[UploadFile] = File(...)):
    """
    Accepts one or more PDF files and executes the extraction pipeline:
    PyMuPDF (original_text) -> Text Cleaning (cleaned_text) -> Section Detection -> SQLite
    """
    uploaded_items: List[Dict[str, Any]] = []
    saved_papers: List[Dict[str, Any]] = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            uploaded_items.append(
                {
                    "id": f"up-{uuid.uuid4().hex[:8]}",
                    "name": file.filename,
                    "size": "0 MB",
                    "progress": 100,
                    "status": "error",
                    "error": "Only PDF documents are supported.",
                }
            )
            continue

        paper_id = f"paper-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = STORAGE_DIR / safe_filename

        # 1. Save uploaded file to disk
        try:
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            uploaded_items.append(
                {
                    "id": f"up-{uuid.uuid4().hex[:8]}",
                    "name": file.filename,
                    "size": "0 MB",
                    "progress": 100,
                    "status": "error",
                    "error": f"Failed to save file: {str(e)}",
                }
            )
            continue

        file_size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)
        size_str = f"{file_size_mb} MB"

        # 2. Extract content with PyMuPDF
        try:
            extracted = extract_pdf_content(str(file_path))
            raw_original_text = extracted["original_text"]
            pages = extracted["pages"]
            blocks = extracted["blocks"]
            meta_title = extracted["meta_title"]
            page_count = extracted["page_count"]

            # 3. Clean text (dehyphenation, ligature normalization, header/footer removal)
            cleaned_text = clean_text_pipeline(raw_original_text, pages)

            # 4. Detect title & authors
            detected_title, detected_authors = detect_title_and_authors(blocks, meta_title=meta_title)
            if detected_title == "Untitled Research Paper" and file.filename:
                # Use filename without extension
                detected_title = Path(file.filename).stem.replace("_", " ").title()

            # 5. Segment structured sections
            sections = segment_sections(cleaned_text, blocks, paper_id)

            # 6. Extract key scientific elements (Abstract, Methodology, Key Findings, Limitations)
            key_elements = extract_key_elements(sections, cleaned_text)

            # Check if title and abstract sections exist, add if missing
            has_title_sec = any(s["section_type"] == "title" for s in sections)
            if not has_title_sec:
                sections.insert(
                    0,
                    {
                        "id": f"{paper_id}-sec-title",
                        "paper_id": paper_id,
                        "section_type": "title",
                        "heading": "Title",
                        "content": detected_title,
                        "page_start": 1,
                        "page_end": 1,
                    },
                )

            has_abstract_sec = any(s["section_type"] == "abstract" for s in sections)
            if not has_abstract_sec and key_elements["abstract"]:
                sections.insert(
                    1,
                    {
                        "id": f"{paper_id}-sec-abstract",
                        "paper_id": paper_id,
                        "section_type": "abstract",
                        "heading": "Abstract",
                        "content": key_elements["abstract"],
                        "page_start": 1,
                        "page_end": 1,
                    },
                )

            # 7. Construct Paper Record
            paper_data = {
                "id": paper_id,
                "title": detected_title,
                "authors": detected_authors,
                "year": datetime.now().year,
                "venue": "Uploaded Document",
                "doi": None,
                "category": "Computer Science",
                "researchArea": "Scientific Literature",
                "tags": ["Ingested PDF", "Extracted Sections"],
                "abstract": key_elements["abstract"],
                "summary": f"Structured analysis of {detected_title}. Key methodology: {key_elements['methodology'][:200]}",
                "methodology": key_elements["methodology"],
                "keyFindings": key_elements["keyFindings"],
                "limitations": key_elements["limitations"],
                "dataset": key_elements["dataset"],
                "model": key_elements["model"],
                "status": "Indexed",
                "citationsCount": 0,
                "pdfSize": size_str,
                "addedAt": datetime.now().strftime("%Y-%m-%d"),
                "original_text": raw_original_text,
                "cleaned_text": cleaned_text,
                "file_path": str(file_path),
            }

            # 8. Save to SQLite
            saved_paper = save_paper(paper_data, sections)
            saved_papers.append(saved_paper)

            uploaded_items.append(
                {
                    "id": f"up-{paper_id}",
                    "name": file.filename,
                    "size": size_str,
                    "progress": 100,
                    "status": "ready",
                    "pages": page_count,
                    "paperId": paper_id,
                    "title": detected_title,
                }
            )

        except Exception as e:
            uploaded_items.append(
                {
                    "id": f"up-{uuid.uuid4().hex[:8]}",
                    "name": file.filename,
                    "size": size_str,
                    "progress": 100,
                    "status": "error",
                    "error": f"Extraction failed: {str(e)}",
                }
            )

    return {
        "success": True,
        "items": uploaded_items,
        "papers": saved_papers,
    }
