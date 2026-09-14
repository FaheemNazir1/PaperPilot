import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.db.database import (
    init_db,
    save_paper,
    get_paper,
    get_paper_sections,
)
from backend.services.pdf_extractor import extract_pdf_content
from backend.services.text_cleaner import clean_text_pipeline
from backend.services.section_detector import (
    detect_title_and_authors,
    segment_sections,
    extract_key_elements,
)


def run_test():
    pdf_path = "test_sample.pdf"
    print(f"=== TESTING REAL PDF INGESTION PIPELINE ON: {pdf_path} ===")

    # 1. Initialize DB
    init_db()
    print("[1/6] SQLite DB initialized.")

    # 2. Extract raw content with PyMuPDF
    extracted = extract_pdf_content(pdf_path)
    original_text = extracted["original_text"]
    pages = extracted["pages"]
    blocks = extracted["blocks"]
    meta_title = extracted["meta_title"]
    page_count = extracted["page_count"]

    print(f"[2/6] PyMuPDF Extraction Complete:")
    print(f"      - Total Pages: {page_count}")
    print(f"      - Original Text Length: {len(original_text)} chars")
    print(f"      - Extracted Blocks: {len(blocks)}")
    assert len(original_text) > 5000, "original_text is too short!"
    assert page_count > 0, "No pages extracted!"

    # 3. Clean text (dehyphenation, ligature resolution, header/footer pruning)
    cleaned_text = clean_text_pipeline(original_text, pages)
    print(f"[3/6] Text Cleaning Complete:")
    print(f"      - Cleaned Text Length: {len(cleaned_text)} chars")
    assert len(cleaned_text) > 4000, "cleaned_text is too short!"

    # 4. Title and Author Detection
    title, authors = detect_title_and_authors(blocks, meta_title=meta_title)
    print(f"[4/6] Metadata Detected:")
    print(f"      - Title: {title}")
    print(f"      - Authors: {authors[:4]} (Total: {len(authors)})")

    # 5. Segment Sections with Flexible Heuristics
    paper_id = "test-attention-paper"
    sections = segment_sections(cleaned_text, blocks, paper_id)
    key_elements = extract_key_elements(sections, cleaned_text)

    print(f"[5/6] Section Detection Complete:")
    print(f"      - Total Structured Sections Detected: {len(sections)}")
    for s in sections:
        snippet = s['content'][:60].replace('\n', ' ')
        print(f"        • [{s['section_type'].upper()}] '{s['heading']}': {snippet}...")

    # Check key canonical sections
    detected_types = {s["section_type"] for s in sections}
    print(f"      - Distinct Canonical Types: {detected_types}")

    # 6. Save and Verify in SQLite
    paper_data = {
        "id": paper_id,
        "title": title,
        "authors": authors,
        "year": 2017,
        "venue": "NeurIPS",
        "doi": "10.48550/arXiv.1706.03762",
        "category": "NLP & LLMs",
        "researchArea": "Deep Learning / Transformers",
        "tags": ["Attention", "Transformers"],
        "abstract": key_elements["abstract"],
        "summary": f"Seminal Transformer architecture paper: {title}.",
        "methodology": key_elements["methodology"],
        "keyFindings": key_elements["keyFindings"],
        "limitations": key_elements["limitations"],
        "dataset": key_elements["dataset"],
        "model": key_elements["model"],
        "status": "Indexed",
        "citationsCount": 118000,
        "pdfSize": "2.2 MB",
        "addedAt": "2024-03-14",
        "original_text": original_text,
        "cleaned_text": cleaned_text,
        "file_path": pdf_path,
    }

    save_paper(paper_data, sections)

    # Query back from SQLite
    retrieved = get_paper(paper_id)
    assert retrieved is not None, "Failed to retrieve paper from SQLite!"
    assert retrieved["original_text"] == original_text, "original_text mismatch!"
    assert retrieved["cleaned_text"] == cleaned_text, "cleaned_text mismatch!"
    assert len(retrieved["sections"]) == len(sections), "sections count mismatch!"

    print(f"[6/6] SQLite Verification Passed:")
    print(f"      - Retrieved Title: {retrieved['title']}")
    print(f"      - Verified original_text ({len(retrieved['original_text'])} chars)")
    print(f"      - Verified cleaned_text ({len(retrieved['cleaned_text'])} chars)")
    print(f"      - Verified {len(retrieved['sections'])} structured sections in SQLite")
    print("=== ALL TESTS PASSED SUCCESSFULLY! ===")


if __name__ == "__main__":
    run_test()
