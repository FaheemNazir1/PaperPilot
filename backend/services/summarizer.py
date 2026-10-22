"""
Literature paper summarizer: the fine-tuned T5-small model from models/model1.ipynb.

Inference settings mirror the notebook exactly: "summarize: " prefix, 512-token input
limit (truncation), max_new_tokens=120, num_beams=2. Only the start of a long paper is
read; callers get the token counts so the UI can say so.

The model is loaded once, on first use. torch/transformers are imported lazily so the
rest of the backend runs (and deploys) without them; in that case the summarizer reports
itself as unavailable instead of crashing.
"""
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

import pymupdf

logger = logging.getLogger(__name__)

TASK_PREFIX = "summarize: "
MAX_INPUT_TOKENS = 512
MAX_NEW_TOKENS = 120
NUM_BEAMS = 2
MODEL_LABEL = "Fine-tuned T5-small"

# Enough characters to fill 512 tokens many times over; avoids tokenizing a whole book.
_MAX_EXTRACT_CHARS = 20_000

_DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "literature_summarizer_final"


class SummarizerUnavailable(Exception):
    """Model files or ML dependencies are not available on this server."""


class UnreadablePdf(Exception):
    """The PDF could not be opened or contains no extractable text."""


_lock = threading.Lock()
_state: Dict[str, Any] = {"tokenizer": None, "model": None, "device": None}


def model_dir() -> Path:
    configured = os.getenv("SUMMARIZER_MODEL_PATH", "").strip()
    return Path(configured) if configured else _DEFAULT_MODEL_DIR


def is_configured() -> bool:
    return (model_dir() / "model.safetensors").is_file() and (model_dir() / "config.json").is_file()


def _load() -> None:
    """Loads the tokenizer and model once. Caller must hold _lock."""
    if _state["model"] is not None:
        return
    if not is_configured():
        logger.error("Summarizer model files not found at %s", model_dir())
        raise SummarizerUnavailable("The summarizer model is not installed on this server.")
    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    except ImportError as exc:
        logger.error("Summarizer dependencies missing: %s", exc)
        raise SummarizerUnavailable("The summarizer is not enabled on this server.") from exc

    path = str(model_dir())
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(path)
    model = AutoModelForSeq2SeqLM.from_pretrained(path).to(device)
    model.eval()
    _state.update(tokenizer=tokenizer, model=model, device=device)
    logger.info("Summarizer model loaded on %s", device)


def extract_text(pdf_path: str) -> str:
    """Reads readable text from the start of the PDF (pages in order, capped)."""
    try:
        doc = pymupdf.open(stream=Path(pdf_path).read_bytes(), filetype="pdf")
    except Exception as exc:
        raise UnreadablePdf("This PDF could not be opened.") from exc
    try:
        parts, total = [], 0
        for page in doc:
            text = page.get_text("text") or ""
            parts.append(text)
            total += len(text)
            if total >= _MAX_EXTRACT_CHARS:
                break
    finally:
        doc.close()
    text = " ".join("\n".join(parts).split())
    if len(text) < 50:
        raise UnreadablePdf("No readable text was found in this PDF (it may be a scanned image).")
    return text


def summarize_pdf(pdf_path: str) -> Dict[str, Any]:
    text = extract_text(pdf_path)
    with _lock:
        _load()
        import torch

        tokenizer, model, device = _state["tokenizer"], _state["model"], _state["device"]
        total_tokens = len(tokenizer(TASK_PREFIX + text, add_special_tokens=False)["input_ids"])
        inputs = tokenizer(
            TASK_PREFIX + text,
            return_tensors="pt",
            max_length=MAX_INPUT_TOKENS,
            truncation=True,
        ).to(device)
        with torch.no_grad():
            output = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, num_beams=NUM_BEAMS)
        summary = tokenizer.decode(output[0], skip_special_tokens=True).strip()

    used = int(inputs["input_ids"].shape[1])
    return {
        "summary": summary,
        "model": MODEL_LABEL,
        "inputTokens": used,
        "totalTokens": total_tokens,
        "truncated": total_tokens > MAX_INPUT_TOKENS,
    }
