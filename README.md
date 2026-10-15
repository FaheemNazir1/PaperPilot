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

## Running Locally

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+ with pip

### 2. Backend Setup
```bash
# Install backend Python dependencies
pip install fastapi uvicorn pymupdf python-multipart pydantic

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
python -m unittest backend.test_personal_library backend.test_ownership_security -v
```
`test_personal_library` runs against a temporary database and upload folder.

## Project Structure

```
PaperPilot/
├── backend/                  # FastAPI Python backend
│   ├── db/                   # SQLite database schema, CRUD, and seed data
│   │   └── database.py       # Table creation (papers, paper_sections) and queries
│   ├── models/               # Pydantic data contracts
│   │   └── schemas.py        # Paper, PaperSection, UploadItem models
│   ├── routers/              # FastAPI route controllers
│   │   └── papers.py         # Paper listing, details, and upload endpoints
│   ├── services/             # Document extraction and parsing services
│   │   ├── pdf_extractor.py  # PyMuPDF raw text and typography extraction
│   │   ├── text_cleaner.py   # Dehyphenation, ligature resolution, header pruning
│   │   └── section_detector.py # Flexible heuristic academic section classifier
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
