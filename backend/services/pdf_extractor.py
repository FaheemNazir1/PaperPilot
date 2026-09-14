import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pymupdf


class ExtractedBlock:
    def __init__(
        self,
        text: str,
        page_num: int,
        font_size: float,
        is_bold: bool,
        bbox: Tuple[float, float, float, float],
    ):
        self.text = text.strip()
        self.page_num = page_num
        self.font_size = font_size
        self.is_bold = is_bold
        self.bbox = bbox

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "page_num": self.page_num,
            "font_size": round(self.font_size, 2),
            "is_bold": self.is_bold,
            "bbox": [round(c, 2) for c in self.bbox],
        }


def extract_pdf_content(file_path: str) -> Dict[str, Any]:
    """
    Extracts raw text, page-by-page text, and block-level typography metadata
    from a scientific PDF using PyMuPDF.

    Returns:
        {
            "original_text": str,   # Full unedited text directly from PyMuPDF
            "pages": List[Dict],    # Page-by-page text and dimensions
            "blocks": List[ExtractedBlock],  # Visual blocks with font sizes
            "meta_title": str,      # Metadata title if available
            "meta_author": str,     # Metadata author if available
            "page_count": int,
        }
    """
    doc = pymupdf.open(file_path)
    page_count = len(doc)
    
    page_texts: List[str] = []
    pages_meta: List[Dict[str, Any]] = []
    extracted_blocks: List[ExtractedBlock] = []

    for page_idx in range(page_count):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_raw_text = page.get_text("text")
        page_texts.append(page_raw_text)

        pages_meta.append({
            "page_num": page_num,
            "width": page.rect.width,
            "height": page.rect.height,
            "raw_text": page_raw_text,
        })

        # Detailed block and span extraction for font-size and heading analysis
        text_page = page.get_text("dict")
        blocks = text_page.get("blocks", [])

        for block in blocks:
            # Check if block is text (type 0)
            if block.get("type") == 0:
                block_text_parts: List[str] = []
                max_font_size = 0.0
                is_bold = False

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        if span_text:
                            block_text_parts.append(span_text)
                            font_size = span.get("size", 0.0)
                            if font_size > max_font_size:
                                max_font_size = font_size
                            flags = span.get("flags", 0)
                            font_name = span.get("font", "").lower()
                            if (flags & 2 != 0) or ("bold" in font_name) or ("black" in font_name):
                                is_bold = True

                joined_text = " ".join("".join(block_text_parts).split())
                if joined_text:
                    bbox = tuple(block.get("bbox", (0, 0, 0, 0)))
                    extracted_blocks.append(
                        ExtractedBlock(
                            text=joined_text,
                            page_num=page_num,
                            font_size=max_font_size,
                            is_bold=is_bold,
                            bbox=bbox,  # type: ignore
                        )
                    )

    # original_text preserves the pure, unedited stream page-by-page
    original_text = "\n\n--- [Page Break] ---\n\n".join(page_texts)

    metadata = doc.metadata or {}
    meta_title = metadata.get("title", "").strip()
    meta_author = metadata.get("author", "").strip()

    doc.close()

    return {
        "original_text": original_text,
        "pages": pages_meta,
        "blocks": extracted_blocks,
        "meta_title": meta_title,
        "meta_author": meta_author,
        "page_count": page_count,
    }
