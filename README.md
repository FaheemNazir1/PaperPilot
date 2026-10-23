# PaperPilot

Scientific paper library for literature reviews

## Overview

PaperPilot lets researchers upload scientific papers (PDF) to a private, per-user library and manage them. AI-assisted features (comparison, gap detection, literature review generation, chat) are planned but **not implemented yet**.

## Available now

- **Google sign-in** (Firebase Authentication) with Bearer ID-token verification in FastAPI.
- **PDF upload**: multi-file upload with type and size validation (limit set by `PAPERPILOT_MAX_UPLOAD_MB`, default 25). Uploading only stores the file and a database record (filename, owner, upload time, size, page count and embedded PDF title/author when present). Nothing is analyzed at upload; papers are marked *Uploaded — not yet analyzed*.
- **My Papers**: list, search, view basic metadata, and delete your own uploads. Counts everywhere come from the same per-user data source.
- **Demo Library**: a small set of example papers, kept strictly separate from your uploads and never counted in My Papers.
- **Per-user isolation**: ownership is taken from the verified token, never from the request; other users' papers return 404.

## Planned (not implemented)

- AI Assistant (chat), currently shown as *Under maintenance*
- Compare Papers, Research Gaps, Literature Review generation (shown as *Coming soon*)
- Embeddings, vector indexing and RAG

The backend also contains **PDF text extraction, text cleaning and section detection services** (`backend/services/`, PyMuPDF-based). They are not run during upload; they are kept for future analysis features.

## Architecture

```
React/Vite (Frontend)
      ↓ HTTP / REST, Firebase ID token
   FastAPI (Backend)
      ↓
 PDF upload → per-user file storage (backend/storage/uploads/<user id>/)
      ↓
 SQLite Database (paperpilot.db): users, papers (user_id / is_demo)
```

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router 7
- **Icons**: Lucide React

### Backend
- **Framework**: Python 3.10+ / FastAPI
- **Document Ingestion**: PyMuPDF (`pymupdf`)
- **Database**: SQLite 3 (WAL mode, relational section storage)
- **ASGI Server**: Uvicorn

### Planned AI Pipeline
- **Embeddings**: Sentence Transformers (`all-MiniLM-L6-v2` / `scibert_scivocab_uncased`)
- **Vector Database**: FAISS / ChromaDB
- **Retrieval Engine**: Hybrid dense-sparse retrieval (BM25 + RAG)
- **Language Models**: Self-hosted / local LLM (Ollama Mistral-7B / LLaMA-3) & cost-effective APIs

## Literature Review Generation (LoRA Inference)

The `POST /api/v1/review/related-work` endpoint generates a related-work section
from a query abstract + up to 10 reference abstracts using the fine-tuned
`Qwen/Qwen2.5-0.5B-Instruct` model with a PaperPilot LoRA adapter.

**⚠️ Disclaimer:** Output is model-generated and is **not factually verified**.
All citations and research claims must be reviewed before use in any publication.

### Model setup (required before first use)

**Step 1 — Extract the LoRA adapter:**
```bash
# From the project root
Expand-Archive -Path paperpilot_lora_adapter.zip -DestinationPath backend/models/paperpilot_lora
```
Or on Linux/macOS:
```bash
unzip paperpilot_lora_adapter.zip -d backend/models/paperpilot_lora
```

After extraction, `backend/models/paperpilot_lora/` must contain at minimum:
`adapter_config.json`, `adapter_model.bin` (or `adapter_model.safetensors`), and the tokenizer files.

**Step 2 — Download the Qwen base model** (done automatically on first request via Hugging Face):
```bash
# Pre-fetch to avoid a long first-request delay (optional but recommended)
python -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')"
```
The model (~1 GB) is cached in `~/.cache/huggingface/`.

**Step 3 — Install ML dependencies:**
```bash
pip install torch transformers peft accelerate
```
On CPU-only machines inference will be slow (~1–2 min per request). A CUDA GPU is recommended.

**Step 4 — Check readiness:**
```
GET /api/v1/review/status
```
Returns `{"model_available": true, ...}` when the adapter files are present.

### API usage

```http
POST /api/v1/review/related-work
Authorization: Bearer <Firebase ID token>
Content-Type: application/json

{
  "query_abstract": "We propose a retrieval-augmented ...",
  "reference_abstracts": [
    "The Transformer is based solely on attention ...",
    "BERT is designed to pre-train deep bidirectional ..."
  ],
  "max_new_tokens": 512
}
```

**Optional env vars:**

| Variable | Default | Description |
|---|---|---|
| `PAPERPILOT_LORA_PATH` | `backend/models/paperpilot_lora` | Path to the extracted adapter |
| `PAPERPILOT_MAX_NEW_TOKENS` | `512` | Default generation length cap |

## Running Locally

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+ with pip

### 2. Backend Setup
```bash
# Install backend Python dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The API server will run at `http://127.0.0.1:8000` (interactive API documentation available at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
The application will be accessible at `http://127.0.0.1:5173`.

### 4. Build for Production
```bash
npm run build
```

### 5. Backend Tests
```bash
# Unit tests (no model or GPU required)
python -m pytest backend/tests/test_review.py -v

# Ownership and security tests
python -m unittest backend.test_ownership_security -v

# Integration test against the real model (adapter + HF base model must be present)
PAPERPILOT_INTEGRATION_TEST=1 python -m pytest backend/tests/test_review.py -v
```

## Project Structure

```
PaperPilot/
├── backend/                  # FastAPI Python backend
│   ├── db/                   # SQLite database schema, CRUD, and seed data
│   │   └── database.py       # Table creation (papers, paper_sections) and queries
│   ├── models/               # Pydantic data contracts
│   │   └── schemas.py        # Paper, PaperSection, UploadItem models
│   ├── routers/              # FastAPI route controllers
│   │   ├── auth.py           # /api/v1/auth/me — user profile
│   │   ├── papers.py         # Paper listing, details, upload, and delete
│   │   └── review.py         # /api/v1/review/related-work — LoRA generation
│   ├── services/             # Document extraction, parsing, and inference
│   │   ├── pdf_extractor.py  # PyMuPDF raw text and typography extraction
│   │   ├── text_cleaner.py   # Dehyphenation, ligature resolution, header pruning
│   │   ├── section_detector.py # Flexible heuristic academic section classifier
│   │   └── llm_service.py    # Singleton model loader + generate_related_work()
│   ├── models/               # Pydantic schemas + LoRA adapter weights
│   │   ├── schemas.py        # Paper, PaperSection, UploadItem models
│   │   └── paperpilot_lora/  # Extracted LoRA adapter (adapter_config.json, weights)
│   ├── tests/
│   │   └── test_review.py    # Unit tests for /review/related-work (model mocked)
│   ├── storage/uploads/      # Ingested PDF documents directory (.gitkeep)
│   └── main.py               # FastAPI app initialization and CORS configuration
├── src/                      # React frontend application
│   ├── components/           # Modular UI components
│   │   ├── assistant/        # Research copilot and grounded citation drawer
│   │   ├── common/           # Reusable badges, cards, modals, command palette
│   │   ├── compare/          # Side-by-side methodology comparison matrix
│   │   ├── gaps/             # 2D opportunity map and thesis brief components
│   │   ├── layout/           # Sidebar, header, navigation shell
│   │   ├── papers/           # Paper card grid, details modal, summary modal
│   │   ├── review/           # Literature review manuscript and citation popovers
│   │   └── upload/           # Drag-and-drop zone and multi-stage ingestion queue
│   ├── context/              # Global state (ToastProvider, toast alerts)
│   ├── data/                 # Benchmark research papers and domain datasets
│   ├── lib/                  # Utilities and asynchronous API client with fallback
│   ├── pages/                # Route view components (8 core research views)
│   ├── types/                # TypeScript interfaces and academic data contracts
│   ├── App.tsx               # Route declarations and layout container
│   └── main.tsx              # React DOM mounting
├── public/                   # Static assets
├── vercel.json               # Vercel deployment configuration with SPA rewrites
├── package.json              # NPM dependencies and build scripts
├── tailwind.config.js        # Tailwind design tokens and slate/cobalt theme
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite bundler and API proxy settings
```

## Status

Active development — frontend and PDF ingestion pipeline implemented.
