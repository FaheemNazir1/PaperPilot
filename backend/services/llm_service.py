"""
LLM service for PaperPilot — loads the Qwen2.5-0.5B-Instruct base model
with the fine-tuned LoRA adapter once at startup and exposes a single
generate_related_work() function for per-request inference.

Model loading is intentionally separated from the FastAPI app lifecycle so
the weights are loaded exactly once, regardless of how many requests arrive.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from threading import Lock
from typing import List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths and constants
# ---------------------------------------------------------------------------

BASE_MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"

# Adapter directory can be overridden with PAPERPILOT_LORA_PATH env var.
_DEFAULT_LORA_PATH = Path(__file__).resolve().parent.parent / "models" / "paperpilot_lora"
LORA_PATH = Path(os.getenv("PAPERPILOT_LORA_PATH", str(_DEFAULT_LORA_PATH)))

# Generation limits
MAX_NEW_TOKENS: int = int(os.getenv("PAPERPILOT_MAX_NEW_TOKENS", "600"))
MAX_ABSTRACTS: int = 10          # upper bound on reference abstracts per request
MAX_ABSTRACT_CHARS: int = 3000   # per-abstract character limit fed to model
MAX_QUERY_CHARS: int = 3000      # query abstract character limit

# ---------------------------------------------------------------------------
# Lazy singleton — only imported when generation is first requested
# ---------------------------------------------------------------------------

_model = None
_tokenizer = None
_device: Optional[str] = None
_load_lock = Lock()
_load_error: Optional[str] = None   # cached error message if loading failed


def _load_model() -> None:
    """Loads the base model + LoRA adapter into module-level singletons."""
    global _model, _tokenizer, _device, _load_error

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel

        if not LORA_PATH.exists():
            raise FileNotFoundError(
                f"LoRA adapter not found at {LORA_PATH}. "
                "Extract paperpilot_lora_adapter.zip to backend/models/paperpilot_lora/ "
                "or set PAPERPILOT_LORA_PATH to its location."
            )

        _device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Loading PaperPilot model on %s …", _device)

        _tokenizer = AutoTokenizer.from_pretrained(
            str(LORA_PATH),
        )
        if _tokenizer.pad_token is None:
            _tokenizer.pad_token = _tokenizer.eos_token

        # Use float16 on CUDA, float32 on CPU (bfloat16 is unsupported on many CPU builds)
        dtype = torch.float16 if _device == "cuda" else torch.float32

        base = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID,
            torch_dtype=dtype,
            device_map="auto" if _device == "cuda" else None,
        )

        _model = PeftModel.from_pretrained(base, str(LORA_PATH))
        _model.eval()

        if _device == "cpu":
            _model = _model.to("cpu")

        logger.info("PaperPilot model ready.")

    except Exception as exc:
        _load_error = str(exc)
        logger.exception("Failed to load PaperPilot model: %s", exc)
        raise


def get_model_and_tokenizer():
    """Returns (model, tokenizer), loading them on first call (thread-safe)."""
    global _model, _tokenizer
    if _model is None:
        with _load_lock:
            if _model is None:           # double-checked locking
                _load_model()
    return _model, _tokenizer


def is_model_available() -> bool:
    """Fast check — returns False if the adapter directory is missing."""
    return LORA_PATH.exists()


def get_load_error() -> Optional[str]:
    return _load_error


# ---------------------------------------------------------------------------
# Prompt builder — mirrors the training prompt exactly
# ---------------------------------------------------------------------------

def _build_prompt(query_abstract: str, reference_abstracts: List[str],
                  reference_titles: Optional[List[str]] = None) -> List[dict]:
    if not reference_abstracts:
        raise ValueError("At least one reference abstract is required.")

    # Include paper titles in the prompt so the model has named anchors
    # to write about rather than generating generic claims.
    ref_lines = []
    for i, r in enumerate(reference_abstracts):
        header = f"Reference Paper {i + 1}"
        if reference_titles and i < len(reference_titles):
            header += f" ({reference_titles[i]})"
        ref_lines.append(f"{header}:\n{r[:MAX_ABSTRACT_CHARS]}")
    refs = "\n\n".join(ref_lines)

    user_content = (
        "Write a related-work section that synthesizes the following reference papers "
        "in relation to the query paper. Only make claims supported by the supplied abstracts. "
        "Cite each reference paper using its number in brackets. "
        "Do not invent results, comparisons, or citations.\n\n"
        f"Query Paper Abstract:\n{query_abstract[:MAX_QUERY_CHARS]}\n\n"
        f"Reference Papers:\n{refs}"
    )
    logger.debug(
        "Prompt: %d ref(s), query=%d chars, prompt=%d chars",
        len(reference_abstracts), len(query_abstract), len(user_content),
    )
    return [
        {"role": "system", "content": "You are a scientific writing assistant."},
        {"role": "user", "content": user_content},
    ]


# ---------------------------------------------------------------------------
# Public generation function
# ---------------------------------------------------------------------------

def generate_related_work(
    query_abstract: str,
    reference_abstracts: List[str],
    max_new_tokens: int = MAX_NEW_TOKENS,
    reference_titles: Optional[List[str]] = None,
) -> str:
    """
    Generates a related-work section from the query abstract and a list of
    reference abstracts.  Raises RuntimeError if the model cannot be loaded.

    NOTE: The output is model-generated text and is NOT verified for factual
    accuracy, citation correctness, or research claims.
    """
    model, tokenizer = get_model_and_tokenizer()

    import torch

    messages = _build_prompt(query_abstract, reference_abstracts, reference_titles)
    logger.info(
        "Prompt: %d refs, query=%d chars, ref_lens=%s",
        len(reference_abstracts),
        len(query_abstract),
        [len(r) for r in reference_abstracts],
    )
    encoded = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    # apply_chat_template may return a BatchEncoding or a raw tensor depending on
    # the transformers version; extract the tensor either way.
    if hasattr(encoded, "input_ids"):
        input_ids = encoded.input_ids
    else:
        input_ids = encoded  # already a plain tensor

    device = next(model.parameters()).device
    input_ids = input_ids.to(device)

    logger.info("Tokenized input: %d tokens", input_ids.shape[-1])

    with torch.no_grad():
        # Build the EOS list: include both <|im_end|> and <|endoftext|> so
        # the model stops cleanly but also doesn't cut off mid-paragraph.
        eos_ids = [tokenizer.eos_token_id]
        # Add <|im_end|> if it exists and differs from eos
        im_end_id = tokenizer.convert_tokens_to_ids("<|im_end|>")
        if im_end_id and im_end_id != tokenizer.eos_token_id:
            eos_ids.append(im_end_id)

        output_ids = model.generate(
            input_ids,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=eos_ids,
        )

    # Decode only the newly generated tokens (strip the prompt)
    new_tokens = output_ids[0][input_ids.shape[-1]:]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    logger.info(
        "Generation complete: %d new tokens, output=%d chars",
        len(new_tokens), len(text),
    )
    return text
