# PaperPilot — Model Training

Fine-tuning experiment for the literature-review generation feature.

## Quick Start

1. Open [`notebooks/paperpilot_finetune_v2.ipynb`](notebooks/paperpilot_finetune_v2.ipynb) in Google Colab
2. **Runtime → Change runtime type → T4 GPU**
3. Run all cells top-to-bottom

## Setup at a Glance

| Item | Value |
|---|---|
| Base model | `Qwen/Qwen2.5-0.5B-Instruct` |
| Dataset | `multi_x_science_sum` (Apache 2.0) |
| Task | Related Work section generation from 4–5 paper abstracts |
| Method | QLoRA (4-bit NF4) + LoRA adapter (r=16, α=32) |
| Hardware | Free Colab T4 (15 GB VRAM) |
| Precision | `fp16` (required for T4 / Turing architecture) |
| Max seq length | 1024 tokens |
| Effective batch | 32 (batch=4 × grad_accum=8) |
| Learning rate | 2e-4 (cosine schedule, 3% warmup) |
| Epochs | 3 |
| Est. time | 30–75 min (3K–5K train examples) |

## Dataset Filtering

The notebook filters `multi_x_science_sum` to examples with:
- **4–5 valid cited paper abstracts** (each ≥ 50 characters)
- **40–600 word Related Work section** (fits within token budget)
- **< 70% token overlap** between output and any single input abstract (anti-copy check)

Expected counts after filtering:
- Train: ~12,000–15,000 examples (all ≥ 3,000 target met)
- Validation: ~2,000–2,500
- Test: ~2,000–2,500

## Directory Structure

```
training/
├── notebooks/
│   └── paperpilot_finetune_v2.ipynb   ← main Colab notebook
├── checkpoints/                        ← saved adapter weights go here
├── data/                               ← local dataset cache (optional)
├── scripts/                            ← future inference/eval scripts
└── README.md
```

## Outputs (inside Colab)

| Path | Contents |
|---|---|
| `/content/paperpilot-qwen-lora/` | Training checkpoints (per epoch) |
| `/content/paperpilot-adapter-v2/` | Final merged LoRA adapter |
| `/content/paperpilot-adapter-v2.zip` | Downloadable adapter zip |

## Loading the Adapter After Training

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

base_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-0.5B-Instruct",
    load_in_4bit=True,
    device_map="auto",
)
model = PeftModel.from_pretrained(base_model, "./paperpilot-adapter-v2")
tokenizer = AutoTokenizer.from_pretrained("./paperpilot-adapter-v2")
```

## Dataset License

`multi_x_science_sum` — **Apache 2.0** (open, commercial use permitted).

## Previous Experiment Issues (fixed in v2)

| Issue | v1 | v2 Fix |
|---|---|---|
| Training examples | 20 (too few → memorisation) | 3,000–15,000 examples |
| Abstract copying | Model memorised one abstract | Anti-copy filter + diverse dataset |
| Dataset split | None | Train / val / test (no leakage) |
| Precision | (unspecified) | fp16 explicitly set for T4 |
| Quantisation | None | 4-bit NF4 QLoRA |
| Evaluation | None | ROUGE on held-out test split |
