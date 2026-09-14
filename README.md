# PaperPilot

AI-Powered Scientific Literature Review Assistant

## Overview

PaperPilot is a research assistant designed to help users process multiple scientific papers, understand their content, compare methodologies, identify research gaps, and eventually generate citation-supported literature reviews.

## Current Capabilities

- **Scientific PDF Upload**: Multi-file drag-and-drop document upload with format and size validation.
- **PDF Text Extraction using PyMuPDF**: High-fidelity page-by-page text, typography hierarchy, and block extraction.
- **Scientific Text Cleaning**: Automated dehyphenation across line breaks, Unicode ligature normalization (`ﬁ` $\rightarrow$ `fi`), running header/footer pruning, and paragraph reconstruction.
- **Academic Section Detection**: Flexible heuristic classifier identifying canonical scientific sections (*Title*, *Abstract*, *Introduction*, *Methodology*, *Results/Findings*, *Discussion*, *Limitations*, *Conclusion*, *References*).
- **Dual Text Stream Storage**: Retains untouched raw text (`original_text`) for source verification alongside sanitized text (`cleaned_text`).
- **Paper Metadata Storage**: Structured entity extraction (methodology summary, reported benchmarks, key findings, dataset and model mentions).
- **SQLite Persistence**: Relational storage in `paperpilot.db` with WAL mode and cascade-linked section records.
- **Paper Browsing & Search**: Multi-domain scientific library with full-text search and category filtering.
- **Research-Paper Comparison UI**: Side-by-side methodology, dataset, and benchmark comparison matrix with difference highlighting.
- **Literature Review Workspace**: Manuscript reader with interactive citation markers linking to bibliographic source popovers.
- **Research Gap Visualization**: 2D scientific impact vs. feasibility opportunity map with detailed thesis brief panels.
- **AI Assistant Interface**: Grounded research copilot with suggested prompts, attribution badges, and verbatim citation drawer.
- **Responsive Research Workspace**: Desktop collapsible sidebar, mobile drawer, and global `⌘K` command palette.

> **Note**: Full AI/RAG functionality (vector embeddings, similarity search, LLM-based autonomous synthesis) is currently under active development. Current synthesis, summaries, and chat features use structured research models and simulated intelligence pipelines.

## Architecture

```
React/Vite (Frontend)
      ↓ HTTP / REST
   FastAPI (Backend)
      ↓
  PDF Upload
      ↓
   PyMuPDF (Raw Text Extraction & Typography)
      ↓
 Text Cleaning (Dehyphenation, Ligatures, Headers/Footers)
      ↓
Section Detection (Title, Abstract, Methods, Results, Discussion, Limitations, Conclusion, References)
      ↓
 SQLite Database (paperpilot.db)
```

Future versions will incorporate:
- Dense vector embeddings (Sentence Transformers / SciBERT)
- Vector indexing (FAISS / ChromaDB)
- Retrieval-Augmented Generation (RAG)
- LLM-based multi-paper literature review generation
- Automated research gap discovery & thesis proposal generation
- Citation grounding and verification metrics

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
