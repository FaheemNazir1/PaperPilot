import re
from typing import Any, Dict, List, Set


LIGATURE_MAP = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬅ": "ft",
    "ﬆ": "st",
    "“": '"',
    "”": '"',
    "„": '"',
    "‘": "'",
    "’": "'",
    "‚": "'",
    "—": " - ",
    "–": "-",
    "…": "...",
    "\xa0": " ",
    "\u200b": "",
    "\u200e": "",
    "\u200f": "",
}


def normalize_ligatures(text: str) -> str:
    """Replaces Unicode ligatures, special quotes, and zero-width spaces with standard ASCII equivalents."""
    for lig, replacement in LIGATURE_MAP.items():
        text = text.replace(lig, replacement)
    return text


def remove_dehyphenation(text: str) -> str:
    """
    Fixes words that were hyphenated across line breaks.
    e.g. 'repre-\nsentation' -> 'representation'
    e.g. 'self-\nattention' -> 'self-attention' (preserves compound hyphens if appropriate)
    """
    # Pattern for broken words: letter followed by hyphen, newline, optional whitespace, and lowercase letter
    def replacer(match: re.Match) -> str:
        part1 = match.group(1)
        part2 = match.group(2)
        # If part2 is lowercase, it was split across lines
        return f"{part1}{part2}"

    # First handle lowercase word joins
    cleaned = re.sub(r"(\b[A-Za-z]+)-\s*\n\s*([a-z]+)\b", replacer, text)
    return cleaned


def detect_and_remove_headers_footers(pages: List[Dict[str, Any]]) -> List[str]:
    """
    Analyzes top and bottom lines across all pages to strip recurring headers,
    footers, journal stamps, arXiv banners, and standalone page numbers.
    """
    if not pages:
        return []

    # Extract first 3 lines and last 3 lines of each page
    top_lines_freq: Dict[str, int] = {}
    bottom_lines_freq: Dict[str, int] = {}

    page_line_lists: List[List[str]] = []

    for p in pages:
        raw_text = p.get("raw_text", "")
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        page_line_lists.append(lines)

        # Check top lines
        for top_line in lines[:3]:
            # Ignore very short lines that might just be numbers for now
            top_lines_freq[top_line] = top_lines_freq.get(top_line, 0) + 1

        # Check bottom lines
        for bot_line in lines[-3:]:
            bottom_lines_freq[bot_line] = bottom_lines_freq.get(bot_line, 0) + 1

    total_pages = len(pages)
    threshold = max(2, total_pages // 3)  # Appears on at least a third of pages

    repeated_headers: Set[str] = {
        line for line, count in top_lines_freq.items() if count >= threshold and len(line) > 6
    }
    repeated_footers: Set[str] = {
        line for line, count in bottom_lines_freq.items() if count >= threshold and len(line) > 6
    }

    # Regex for typical standalone page numbers or banners
    page_num_regex = re.compile(
        r"^(page\s+\d+(\s+of\s+\d+)?|\d+|\-\s*\d+\s*\-|arXiv:\d+\.\d+(v\d+)?(\s*\[[\w\.\-]+\])?)$",
        re.IGNORECASE,
    )

    cleaned_pages: List[str] = []

    for lines in page_line_lists:
        filtered_lines: List[str] = []
        line_count = len(lines)

        for idx, line in enumerate(lines):
            # Check if line is at the top margin (first 2 lines)
            if idx < 2:
                if line in repeated_headers or page_num_regex.match(line):
                    continue

            # Check if line is at bottom margin (last 2 lines)
            if idx >= line_count - 2:
                if line in repeated_footers or page_num_regex.match(line):
                    continue

            # Check arXiv preprint stamp anywhere near top
            if idx < 4 and ("arXiv:" in line or "Preprint. Under review" in line):
                continue

            filtered_lines.append(line)

        cleaned_pages.append("\n".join(filtered_lines))

    return cleaned_pages


def clean_text_pipeline(raw_text: str, pages: List[Dict[str, Any]]) -> str:
    """
    Orchestrates complete text cleaning pipeline to generate `cleaned_text`:
    1. Header & footer removal
    2. Ligature and Unicode normalization
    3. Dehyphenation across line breaks
    4. Paragraph and whitespace restructuring
    """
    # 1. Remove page headers and footers
    cleaned_page_texts = detect_and_remove_headers_footers(pages)
    combined = "\n\n".join(cleaned_page_texts) if cleaned_page_texts else raw_text

    # 2. Normalize ligatures
    combined = normalize_ligatures(combined)

    # 3. Fix hyphenated line breaks
    combined = remove_dehyphenation(combined)

    # 4. Whitespace and paragraph reconstruction
    # Replace non-breaking spaces and tabs
    combined = re.sub(r"[ \t]+", " ", combined)
    
    # Split paragraphs by double newlines while joining artificial single newlines
    paragraphs = re.split(r"\n\s*\n", combined)
    normalized_paragraphs: List[str] = []

    for p in paragraphs:
        # Join lines within the same paragraph if it doesn't look like a list or heading
        lines = [line.strip() for line in p.splitlines() if line.strip()]
        if not lines:
            continue
        
        # If any line starts with a bullet point or number, keep linebreaks
        is_list = any(re.match(r"^(\d+[\.\)]|[\-\*•])\s+", line) for line in lines)
        if is_list:
            normalized_paragraphs.append("\n".join(lines))
        else:
            normalized_paragraphs.append(" ".join(lines))

    cleaned_text = "\n\n".join(normalized_paragraphs)
    return cleaned_text.strip()
