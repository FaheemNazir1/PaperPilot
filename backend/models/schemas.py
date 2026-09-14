from typing import List, Optional
from pydantic import BaseModel, Field


class PaperSection(BaseModel):
    id: str
    paper_id: str
    section_type: str = Field(
        ...,
        description="Canonical section type: title, abstract, introduction, methodology, results, discussion, limitations, conclusion, references, other",
    )
    heading: str
    content: str
    page_start: int = 1
    page_end: int = 1


class Paper(BaseModel):
    id: str
    title: str
    authors: List[str] = []
    year: int = 2024
    venue: str = "Preprint"
    doi: Optional[str] = None
    category: str = "Machine Learning"
    researchArea: str = "Computer Science"
    tags: List[str] = []
    abstract: str = ""
    summary: str = ""
    methodology: str = ""
    keyFindings: List[str] = []
    limitations: List[str] = []
    dataset: str = "N/A"
    model: str = "N/A"
    status: str = "Indexed"
    citationsCount: int = 0
    pdfSize: str = "0 MB"
    addedAt: str = ""
    original_text: Optional[str] = ""
    cleaned_text: Optional[str] = ""
    sections: Optional[List[PaperSection]] = []


class UploadItem(BaseModel):
    id: str
    name: str
    size: str
    progress: int = 100
    status: str = "ready"
    pages: Optional[int] = None
    paperId: Optional[str] = None
    title: Optional[str] = None
