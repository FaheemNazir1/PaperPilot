import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "paperpilot.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db() -> None:
    """Creates database schema for papers and structured sections."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS papers (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                authors TEXT,
                year INTEGER DEFAULT 2024,
                venue TEXT DEFAULT 'Preprint',
                doi TEXT,
                category TEXT DEFAULT 'Machine Learning',
                research_area TEXT DEFAULT 'Computer Science',
                tags TEXT,
                abstract TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                methodology TEXT DEFAULT '',
                key_findings TEXT,
                limitations TEXT,
                dataset TEXT DEFAULT 'N/A',
                model TEXT DEFAULT 'N/A',
                status TEXT DEFAULT 'Indexed',
                citations_count INTEGER DEFAULT 0,
                pdf_size TEXT DEFAULT '0 MB',
                added_at TEXT,
                original_text TEXT DEFAULT '',
                cleaned_text TEXT DEFAULT '',
                file_path TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
            CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);

            CREATE TABLE IF NOT EXISTS paper_sections (
                id TEXT PRIMARY KEY,
                paper_id TEXT NOT NULL,
                section_type TEXT NOT NULL,
                heading TEXT NOT NULL,
                content TEXT NOT NULL,
                page_start INTEGER DEFAULT 1,
                page_end INTEGER DEFAULT 1,
                order_index INTEGER DEFAULT 0,
                FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_sections_paper_id ON paper_sections(paper_id);
            CREATE INDEX IF NOT EXISTS idx_sections_type ON paper_sections(section_type);
        """
        )
        conn.commit()


def save_paper(paper_data: Dict[str, Any], sections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Inserts or replaces a paper along with its structured sections."""
    with get_db_connection() as conn:
        # Convert lists to JSON strings for storage
        authors_json = json.dumps(paper_data.get("authors", []))
        tags_json = json.dumps(paper_data.get("tags", []))
        findings_json = json.dumps(paper_data.get("keyFindings", []))
        limitations_json = json.dumps(paper_data.get("limitations", []))

        conn.execute(
            """
            INSERT OR REPLACE INTO papers (
                id, title, authors, year, venue, doi, category, research_area,
                tags, abstract, summary, methodology, key_findings, limitations,
                dataset, model, status, citations_count, pdf_size, added_at,
                original_text, cleaned_text, file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                paper_data["id"],
                paper_data.get("title", "Untitled Document"),
                authors_json,
                paper_data.get("year", 2024),
                paper_data.get("venue", "Preprint"),
                paper_data.get("doi"),
                paper_data.get("category", "General"),
                paper_data.get("researchArea", "Science"),
                tags_json,
                paper_data.get("abstract", ""),
                paper_data.get("summary", ""),
                paper_data.get("methodology", ""),
                findings_json,
                limitations_json,
                paper_data.get("dataset", "N/A"),
                paper_data.get("model", "N/A"),
                paper_data.get("status", "Indexed"),
                paper_data.get("citationsCount", 0),
                paper_data.get("pdfSize", "0 MB"),
                paper_data.get("addedAt", ""),
                paper_data.get("original_text", ""),
                paper_data.get("cleaned_text", ""),
                paper_data.get("file_path", ""),
            ),
        )

        # Remove existing sections for this paper before re-adding
        conn.execute("DELETE FROM paper_sections WHERE paper_id = ?", (paper_data["id"],))

        # Insert structured sections
        for idx, sec in enumerate(sections):
            conn.execute(
                """
                INSERT INTO paper_sections (
                    id, paper_id, section_type, heading, content, page_start, page_end, order_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    sec.get("id", f"{paper_data['id']}-sec-{idx}"),
                    paper_data["id"],
                    sec.get("section_type", "other"),
                    sec.get("heading", "Untitled Section"),
                    sec.get("content", ""),
                    sec.get("page_start", 1),
                    sec.get("page_end", 1),
                    idx,
                ),
            )

        conn.commit()

    return get_paper(paper_data["id"])  # type: ignore


def _row_to_paper_dict(row: sqlite3.Row, include_sections: bool = False) -> Dict[str, Any]:
    data = dict(row)
    paper = {
        "id": data["id"],
        "title": data["title"],
        "authors": json.loads(data["authors"]) if data.get("authors") else [],
        "year": data["year"],
        "venue": data["venue"],
        "doi": data.get("doi"),
        "category": data["category"],
        "researchArea": data["research_area"],
        "tags": json.loads(data["tags"]) if data.get("tags") else [],
        "abstract": data["abstract"],
        "summary": data["summary"],
        "methodology": data["methodology"],
        "keyFindings": json.loads(data["key_findings"]) if data.get("key_findings") else [],
        "limitations": json.loads(data["limitations"]) if data.get("limitations") else [],
        "dataset": data["dataset"],
        "model": data["model"],
        "status": data["status"],
        "citationsCount": data["citations_count"],
        "pdfSize": data["pdf_size"],
        "addedAt": data["added_at"],
        "original_text": data.get("original_text", ""),
        "cleaned_text": data.get("cleaned_text", ""),
    }

    if include_sections:
        paper["sections"] = get_paper_sections(data["id"])

    return paper


def get_all_papers(search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches all papers from database, with optional keyword or category filtering."""
    query = "SELECT * FROM papers WHERE 1=1"
    params: List[Any] = []

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (title LIKE ? OR abstract LIKE ? OR authors LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id ASC"

    with get_db_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [_row_to_paper_dict(r) for r in rows]


def get_paper(paper_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a single paper by ID including full sections."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not row:
            return None
        return _row_to_paper_dict(row, include_sections=True)


def get_paper_sections(paper_id: str) -> List[Dict[str, Any]]:
    """Fetches structured sections for a paper."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM paper_sections WHERE paper_id = ? ORDER BY order_index ASC",
            (paper_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "paper_id": r["paper_id"],
                "section_type": r["section_type"],
                "heading": r["heading"],
                "content": r["content"],
                "page_start": r["page_start"],
                "page_end": r["page_end"],
            }
            for r in rows
        ]


def delete_paper(paper_id: str) -> bool:
    """Deletes paper and cascade-deletes its sections."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM papers WHERE id = ?", (paper_id,))
        conn.commit()
        return cursor.rowcount > 0


def seed_default_papers() -> None:
    """Seeds the benchmark scientific papers from library if not already present."""
    initial_papers = [
        {
            "id": "paper-01",
            "title": "Attention Is All You Need",
            "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Łukasz Kaiser", "Illia Polosukhin"],
            "year": 2017,
            "venue": "NeurIPS 2017",
            "doi": "10.48550/arXiv.1706.03762",
            "category": "NLP & LLMs",
            "researchArea": "Deep Learning / Machine Translation",
            "tags": ["Transformers", "Self-Attention", "Seq2Seq", "Translation"],
            "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
            "summary": "Introduced the Transformer architecture relying exclusively on self-attention mechanisms, establishing the foundational paradigm for modern large language models.",
            "methodology": "Multi-Head Scaled Dot-Product Self-Attention with sinusoidal positional encodings and multi-layer feed-forward networks.",
            "keyFindings": [
                "Surpassed existing state-of-the-art BLEU scores on WMT 2014 English-to-German translation (28.4 BLEU).",
                "Reduced training time to 3.5 days on 8 P100 GPUs compared to recurrent architectures.",
                "Generalizes efficiently to English constituency parsing tasks."
            ],
            "limitations": [
                "Quadratic computational complexity O(n²) with respect to sequence length.",
                "Requires substantial computational scale and large batch sizes for stability."
            ],
            "dataset": "WMT 2014 English-to-German & English-to-French",
            "model": "Transformer (Base & Large)",
            "status": "Indexed",
            "citationsCount": 118400,
            "pdfSize": "2.2 MB",
            "addedAt": "2024-03-01",
            "original_text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
            "cleaned_text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
            "sections": [
                {"id": "paper-01-sec-0", "paper_id": "paper-01", "section_type": "title", "heading": "Title", "content": "Attention Is All You Need", "page_start": 1, "page_end": 1},
                {"id": "paper-01-sec-1", "paper_id": "paper-01", "section_type": "abstract", "heading": "Abstract", "content": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.", "page_start": 1, "page_end": 1},
                {"id": "paper-01-sec-2", "paper_id": "paper-01", "section_type": "introduction", "heading": "1. Introduction", "content": "Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling. Recurrent models inherently factor computation along the symbol positions of input and output sequences.", "page_start": 1, "page_end": 2},
                {"id": "paper-01-sec-3", "paper_id": "paper-01", "section_type": "methodology", "heading": "3. Model Architecture", "content": "The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.", "page_start": 2, "page_end": 5},
                {"id": "paper-01-sec-4", "paper_id": "paper-01", "section_type": "results", "heading": "5. Results", "content": "On the WMT 2014 English-to-German translation task, the big transformer model achieves 28.4 BLEU, outperforming the best previously reported models by more than 2.0 BLEU, setting a new state-of-the-art record.", "page_start": 6, "page_end": 8},
                {"id": "paper-01-sec-5", "paper_id": "paper-01", "section_type": "conclusion", "heading": "6. Conclusion", "content": "In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.", "page_start": 9, "page_end": 9}
            ]
        },
        {
            "id": "paper-02",
            "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
            "authors": ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
            "year": 2018,
            "venue": "NAACL 2019",
            "doi": "10.48550/arXiv.1810.04805",
            "category": "NLP & LLMs",
            "researchArea": "Pre-trained Representations / Language Modeling",
            "tags": ["Masked LM", "Bidirectional", "Transformer", "Fine-Tuning"],
            "abstract": "We introduce a new language representation model called BERT. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
            "summary": "Demonstrated that masked bidirectional self-attention pre-training enables superior transfer learning across 11 NLP benchmarks with simple task-specific output layers.",
            "methodology": "Masked Language Model (MLM) and Next Sentence Prediction (NSP) pre-training on BooksCorpus and English Wikipedia.",
            "keyFindings": [
                "Achieved 80.5% GLUE benchmark score, a 7.7% absolute point improvement over previous state-of-the-art.",
                "Pushed SQuAD v1.1 question answering F1 score to 93.2%, outperforming human performance.",
                "Established unified fine-tuning across both token-level and sentence-level downstream tasks."
            ],
            "limitations": [
                "Discrepancy between pre-training and fine-tuning due to artificial [MASK] token absence at inference.",
                "Next sentence prediction objective showed limited utility in subsequent ablation studies."
            ],
            "dataset": "BooksCorpus (800M words) & English Wikipedia (2,500M words)",
            "model": "BERT-Base & BERT-Large",
            "status": "Indexed",
            "citationsCount": 94100,
            "pdfSize": "1.8 MB",
            "addedAt": "2024-03-02",
            "original_text": "We introduce a new language representation model called BERT...",
            "cleaned_text": "We introduce a new language representation model called BERT...",
            "sections": [
                {"id": "paper-02-sec-0", "paper_id": "paper-02", "section_type": "title", "heading": "Title", "content": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding", "page_start": 1, "page_end": 1},
                {"id": "paper-02-sec-1", "paper_id": "paper-02", "section_type": "abstract", "heading": "Abstract", "content": "We introduce a new language representation model called BERT. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.", "page_start": 1, "page_end": 1},
                {"id": "paper-02-sec-2", "paper_id": "paper-02", "section_type": "methodology", "heading": "3. BERT", "content": "BERT's model architecture is a multi-layer bidirectional Transformer encoder based on the original implementation described in Vaswani et al. (2017). We pre-train BERT using two unsupervised tasks: Masked LM and Next Sentence Prediction.", "page_start": 2, "page_end": 4},
                {"id": "paper-02-sec-3", "paper_id": "paper-02", "section_type": "results", "heading": "4. Experiments", "content": "BERT-Large outperforms all systems on 11 diverse tasks, setting new state-of-the-art benchmarks on GLUE, MultiNLI, SQuAD v1.1, and SQuAD v2.0.", "page_start": 4, "page_end": 7},
                {"id": "paper-02-sec-4", "paper_id": "paper-02", "section_type": "conclusion", "heading": "6. Conclusion", "content": "Recent empirical improvements due to transfer learning with language models have demonstrated that rich, unsupervised pre-training is an integral part of many language understanding systems.", "page_start": 8, "page_end": 8}
            ]
        },
        {
            "id": "paper-03",
            "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
            "authors": ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus", "Fabio Petroni", "Vladimir Karpukhin", "Naman Goyal", "Heinrich Küttler", "Mike Lewis", "Wen-tau Yih", "Tim Rocktäschel", "Sebastian Riedel", "Douwe Kiela"],
            "year": 2020,
            "venue": "NeurIPS 2020",
            "doi": "10.48550/arXiv.2005.11401",
            "category": "NLP & LLMs",
            "researchArea": "Knowledge Retrieval / Hallucination Mitigation",
            "tags": ["RAG", "Dense Passage Retrieval", "Grounded Generation", "Factuality"],
            "abstract": "Large pre-trained language models have been shown to store factual knowledge in their parameters. However, their ability to access and precisely manipulate knowledge is still limited. We explore general-purpose fine-tuning recipes for retrieval-augmented generation (RAG).",
            "summary": "Combined a pre-trained sequence-to-sequence generator with dense passage retrieval to ground responses in external documents and drastically mitigate hallucination.",
            "methodology": "Coupled Dense Passage Retriever (DPR) encoder with BART sequence-to-sequence generator via marginalization over top-K retrieved Wikipedia passages.",
            "keyFindings": [
                "Set new state-of-the-art on open-domain question answering benchmarks (Natural Questions: 44.5 EM).",
                "Generated significantly more specific, diverse, and factually grounded text than parametric-only seq2seq baselines.",
                "Demonstrated continuous non-parametric index updating without retraining the base generator."
            ],
            "limitations": [
                "Latency overhead introduced by top-K retrieval and cross-attention across retrieved passages.",
                "Vulnerable to retrieval noise when retriever surfaces unhelpful or conflicting contexts."
            ],
            "dataset": "Natural Questions, TriviaQA, WebQuestions, CuratedTREC, MS-MARCO",
            "model": "RAG-Token & RAG-Sequence (DPR + BART)",
            "status": "Indexed",
            "citationsCount": 4200,
            "pdfSize": "2.9 MB",
            "addedAt": "2024-03-03",
            "original_text": "Large pre-trained language models have been shown to store factual knowledge in their parameters...",
            "cleaned_text": "Large pre-trained language models have been shown to store factual knowledge in their parameters...",
            "sections": [
                {"id": "paper-03-sec-0", "paper_id": "paper-03", "section_type": "title", "heading": "Title", "content": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", "page_start": 1, "page_end": 1},
                {"id": "paper-03-sec-1", "paper_id": "paper-03", "section_type": "abstract", "heading": "Abstract", "content": "Large pre-trained language models have been shown to store factual knowledge in their parameters. However, their ability to access and precisely manipulate knowledge is still limited. We explore general-purpose fine-tuning recipes for retrieval-augmented generation (RAG).", "page_start": 1, "page_end": 1},
                {"id": "paper-03-sec-2", "paper_id": "paper-03", "section_type": "methodology", "heading": "2. Methods", "content": "We propose RAG models, which use the input sequence x to retrieve text passages z and use them as additional context when generating the target sequence y. We leverage DPR as our neural retriever and BART as our seq2seq generator.", "page_start": 2, "page_end": 4},
                {"id": "paper-03-sec-3", "paper_id": "paper-03", "section_type": "results", "heading": "4. Results", "content": "RAG models establish a new state of the art on Natural Questions, TriviaQA, and WebQuestions, outperforming pure parametric models and previous extractive retrieval-based models.", "page_start": 5, "page_end": 8},
                {"id": "paper-03-sec-4", "paper_id": "paper-03", "section_type": "conclusion", "heading": "6. Conclusion", "content": "In this work, we presented RAG models which combine parametric and non-parametric memory. Our results demonstrate that non-parametric retrieval memory significantly improves knowledge-intensive generation tasks.", "page_start": 9, "page_end": 9}
            ]
        },
        {
            "id": "paper-04",
            "title": "Transformer-Based Methods for Scientific Document Summarization: A Multi-Scale Perspective",
            "authors": ["E. Cohan", "I. Cachola", "D. S. Weld"],
            "year": 2024,
            "venue": "Journal of Artificial Intelligence Research (JAIR)",
            "doi": "10.1613/jair.1.14201",
            "category": "Natural Language Processing",
            "researchArea": "Document Summarization",
            "tags": ["Summarization", "Transformers", "Document Analysis", "Long-Context"],
            "abstract": "Scientific papers represent long, complex documents with high information density, hierarchical section organization, and specialized vocabulary. We propose a hierarchical sparse-attention transformer capable of generating section-level and document-level multi-scale summaries.",
            "summary": "Introduces a hierarchical multi-scale attention network specifically engineered for 15,000+ token academic papers.",
            "methodology": "Hierarchical sparse attention with chunked sliding windows and cross-section global tokens.",
            "keyFindings": [
                "Explicit hierarchical section modeling improves ROUGE-L scores by 4.3 points over standard flat transformers.",
                "Reduces GPU memory footprint by 64% using adaptive token routing."
            ],
            "limitations": [
                "Sensitive to non-standard paper formatting and missing header tags.",
                "Requires pre-segmented documents."
            ],
            "dataset": "arXiv Long-Paper Benchmark, PubMed-100k",
            "model": "Hierarchical Longformer-Sci",
            "status": "Analyzed",
            "citationsCount": 189,
            "pdfSize": "4.2 MB",
            "addedAt": "2026-03-05",
            "original_text": "Scientific papers represent long, complex documents with high information density...",
            "cleaned_text": "Scientific papers represent long, complex documents with high information density...",
            "sections": [
                {"id": "paper-04-sec-0", "paper_id": "paper-04", "section_type": "title", "heading": "Title", "content": "Transformer-Based Methods for Scientific Document Summarization", "page_start": 1, "page_end": 1},
                {"id": "paper-04-sec-1", "paper_id": "paper-04", "section_type": "abstract", "heading": "Abstract", "content": "Scientific papers represent long, complex documents with high information density, hierarchical section organization, and specialized vocabulary. We propose a hierarchical sparse-attention transformer capable of generating section-level and document-level multi-scale summaries.", "page_start": 1, "page_end": 1},
                {"id": "paper-04-sec-2", "paper_id": "paper-04", "section_type": "methodology", "heading": "Methodology", "content": "Hierarchical sparse attention with chunked sliding windows and cross-section global tokens.", "page_start": 2, "page_end": 5},
                {"id": "paper-04-sec-3", "paper_id": "paper-04", "section_type": "results", "heading": "Results", "content": "Explicit hierarchical section modeling improves ROUGE-L scores by 4.3 points over standard flat transformers.", "page_start": 6, "page_end": 8}
            ]
        },
        {
            "id": "paper-05",
            "title": "Contrastive Self-Supervised Learning for Graph Neural Networks in Molecular Property Prediction",
            "authors": ["Y. Wang", "T. Kipf", "S. Bengio", "A. Grover"],
            "year": 2024,
            "venue": "Nature Machine Intelligence",
            "doi": "10.1038/s42256-024-00812-x",
            "category": "Bioinformatics & ChemAI",
            "researchArea": "Bioinformatics & ChemAI",
            "tags": ["Graph Neural Networks", "Drug Discovery", "Self-Supervised"],
            "abstract": "Accurate molecular property prediction is critical for accelerated pharmacological discovery. We present MolCL, a multi-view graph contrastive learning framework that captures sub-graph motifs and 3D conformal stereochemistry.",
            "summary": "Employs contrastive self-supervised graph neural networks to pre-train on 10M unlabeled molecular graphs.",
            "methodology": "Dual-level contrastive loss optimizing node-level chemical bond embeddings and graph-level scaffold representations.",
            "keyFindings": [
                "Self-supervised pre-training yields 14% improvement in ROC-AUC on low-data downstream drug targets.",
                "Robust to conformational rotations and chirality transformations."
            ],
            "limitations": [
                "High computational overhead for 3D coordinate relaxation.",
                "Limited generalization to large macromolecular complexes."
            ],
            "dataset": "ZINC15, MoleculeNet (Tox21, HIV, BACE)",
            "model": "MolCL (GNN + Graph Transformer)",
            "status": "Analyzed",
            "citationsCount": 215,
            "pdfSize": "4.7 MB",
            "addedAt": "2026-03-07",
            "original_text": "Accurate molecular property prediction is critical for accelerated pharmacological discovery...",
            "cleaned_text": "Accurate molecular property prediction is critical for accelerated pharmacological discovery...",
            "sections": [
                {"id": "paper-05-sec-0", "paper_id": "paper-05", "section_type": "title", "heading": "Title", "content": "Contrastive Self-Supervised Learning for Graph Neural Networks in Molecular Property Prediction", "page_start": 1, "page_end": 1},
                {"id": "paper-05-sec-1", "paper_id": "paper-05", "section_type": "abstract", "heading": "Abstract", "content": "Accurate molecular property prediction is critical for accelerated pharmacological discovery. We present MolCL, a multi-view graph contrastive learning framework that captures sub-graph motifs and 3D conformal stereochemistry.", "page_start": 1, "page_end": 1},
                {"id": "paper-05-sec-2", "paper_id": "paper-05", "section_type": "methodology", "heading": "Methods", "content": "Dual-level contrastive loss optimizing node-level chemical bond embeddings and graph-level scaffold representations using Weisfeiler-Lehman topological augmentations.", "page_start": 2, "page_end": 4},
                {"id": "paper-05-sec-3", "paper_id": "paper-05", "section_type": "results", "heading": "Results", "content": "Self-supervised pre-training yields 14% improvement in ROC-AUC on low-data downstream drug targets.", "page_start": 5, "page_end": 7}
            ]
        },
        {
            "id": "paper-06",
            "title": "Physics-Informed Neural Networks for High-Dimensional Climate Dynamics Emulation",
            "authors": ["M. Raissi", "G. E. Karniadakis", "S. Rasp", "L. Bretherton"],
            "year": 2024,
            "venue": "Geophysical Research Letters",
            "doi": "10.1029/2024GL10892",
            "category": "Earth & Climate Sciences",
            "researchArea": "Computational Climate Modeling",
            "tags": ["Physics-Informed ML", "Climate Modeling", "PDE Solvers"],
            "abstract": "Numerical global climate models (GCMs) solve Navier-Stokes and thermodynamic equations at immense supercomputing cost. We design a physics-informed neural operator (PINO) that integrates fluid conservation laws directly into the loss function for sub-seasonal precipitation forecasting.",
            "summary": "Develops a physics-informed neural operator embedding Navier-Stokes conservation laws into loss formulations.",
            "methodology": "Fourier Neural Operators constrained by Navier-Stokes vorticity and mass conservation differential equations.",
            "keyFindings": [
                "Maintains physical consistency over 30-day forecast horizons without unphysical energy divergence.",
                "Inference speedup of 450x compared to traditional finite-element numerical weather prediction models."
            ],
            "limitations": [
                "Struggles with chaotic boundary conditions during sudden stratospheric warming events.",
                "Resolution capped at 0.25° grid due to memory constraints."
            ],
            "dataset": "ERA5 Reanalysis (1979-2022), NOAA GFS",
            "model": "Physics-Informed Fourier Neural Operator (PINO)",
            "status": "Analyzed",
            "citationsCount": 164,
            "pdfSize": "6.3 MB",
            "addedAt": "2026-03-08",
            "original_text": "Numerical global climate models (GCMs) solve Navier-Stokes and thermodynamic equations...",
            "cleaned_text": "Numerical global climate models (GCMs) solve Navier-Stokes and thermodynamic equations...",
            "sections": [
                {"id": "paper-06-sec-0", "paper_id": "paper-06", "section_type": "title", "heading": "Title", "content": "Physics-Informed Neural Networks for High-Dimensional Climate Dynamics Emulation", "page_start": 1, "page_end": 1},
                {"id": "paper-06-sec-1", "paper_id": "paper-06", "section_type": "abstract", "heading": "Abstract", "content": "Numerical global climate models (GCMs) solve Navier-Stokes and thermodynamic equations at immense supercomputing cost. We design a physics-informed neural operator (PINO) that integrates fluid conservation laws directly into the loss function.", "page_start": 1, "page_end": 1},
                {"id": "paper-06-sec-2", "paper_id": "paper-06", "section_type": "methodology", "heading": "Methods", "content": "Fourier Neural Operators constrained by Navier-Stokes vorticity and mass conservation differential equations.", "page_start": 2, "page_end": 5},
                {"id": "paper-06-sec-3", "paper_id": "paper-06", "section_type": "results", "heading": "Results", "content": "Maintains physical consistency over 30-day forecast horizons with 450x speedup.", "page_start": 6, "page_end": 8}
            ]
        },
        {
            "id": "paper-07",
            "title": "Vision-Language Pre-training for Zero-Shot Medical Image Segmentation and Report Grounding",
            "authors": ["S. Rajpurkar", "E. Topol", "F. Wang", "A. Ng"],
            "year": 2023,
            "venue": "IEEE Transactions on Medical Imaging",
            "doi": "10.1109/TMI.2023.3289011",
            "category": "Medical Computer Vision",
            "researchArea": "Medical Computer Vision",
            "tags": ["Medical Vision", "Zero-Shot", "Multimodal", "Clinical AI"],
            "abstract": "Annotating medical images requires specialized clinician expertise and is bottlenecked by regulatory constraints. We formulate MedVLP, a vision-language foundation model trained on 1.2M radiograph-report pairs capable of open-vocabulary zero-shot anatomical segmentation.",
            "summary": "A multimodal foundation model trained on radiograph-report pairings capable of zero-shot pathology segmentation.",
            "methodology": "Contrastive vision-language pre-training with text-guided cross-attention mask decoders.",
            "keyFindings": [
                "Zero-shot Dice score reaches 84.1% on thoracic abnormality segmentation.",
                "Direct natural language prompts enable flexible queries without fine-tuning masks."
            ],
            "limitations": [
                "Susceptible to linguistic ambiguity in free-text clinical impressions.",
                "Performance drops on rare conditions with under 50 training references."
            ],
            "dataset": "MIMIC-CXR, CheXpert, VinDr-CXR",
            "model": "MedVLP (Swin-Transformer + BioClinicalBERT)",
            "status": "Embedding Ready",
            "citationsCount": 420,
            "pdfSize": "3.9 MB",
            "addedAt": "2026-03-10",
            "original_text": "Annotating medical images requires specialized clinician expertise...",
            "cleaned_text": "Annotating medical images requires specialized clinician expertise...",
            "sections": [
                {"id": "paper-07-sec-0", "paper_id": "paper-07", "section_type": "title", "heading": "Title", "content": "Vision-Language Pre-training for Zero-Shot Medical Image Segmentation", "page_start": 1, "page_end": 1},
                {"id": "paper-07-sec-1", "paper_id": "paper-07", "section_type": "abstract", "heading": "Abstract", "content": "Annotating medical images requires specialized clinician expertise and is bottlenecked by regulatory constraints. We formulate MedVLP, a vision-language foundation model trained on 1.2M radiograph-report pairs.", "page_start": 1, "page_end": 1},
                {"id": "paper-07-sec-2", "paper_id": "paper-07", "section_type": "methodology", "heading": "Methods", "content": "Contrastive vision-language pre-training with text-guided cross-attention mask decoders.", "page_start": 2, "page_end": 5},
                {"id": "paper-07-sec-3", "paper_id": "paper-07", "section_type": "results", "heading": "Results", "content": "Zero-shot Dice score reaches 84.1% on thoracic abnormality segmentation.", "page_start": 6, "page_end": 8}
            ]
        },
        {
            "id": "paper-08",
            "title": "Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering",
            "authors": ["L. B. Smith", "D. Hendrycks", "K. Cho", "J. Weston"],
            "year": 2024,
            "venue": "Transactions of the Association for Computational Linguistics (TACL)",
            "doi": "10.1162/tacl_a_00619",
            "category": "Natural Language Processing",
            "researchArea": "Scientific Factuality & Alignment",
            "tags": ["Hallucination", "Factuality", "Evaluation", "Benchmarking"],
            "abstract": "Hallucinated citations and fictitious numerical claims pose catastrophic risks in scientific AI assistants. This paper presents SciFact-Bench, a diagnostic benchmark for evaluating citation precision, claim entailment, and counterfactual robustness in scientific QA.",
            "summary": "Rigorous empirical benchmark evaluating 8 hallucination mitigation techniques across scientific literature assistants.",
            "methodology": "Adversarial perturbation of scientific claims, counterfactual citation insertion, and multi-annotator fact-checking verification.",
            "keyFindings": [
                "Post-hoc verification pipelines reduce fictitious citations by 81% compared to greedy decoding.",
                "Explicit page and section citation grounding improves human expert trust scores from 3.1 to 4.7 out of 5."
            ],
            "limitations": [
                "Verification pipelines increase response latency by approximately 2.4x.",
                "High sensitivity to chunking granularity in source document vectorization."
            ],
            "dataset": "SciFact-Bench (3,500 expert-annotated scientific queries)",
            "model": "FactCheck-LM + Constrained Decoders",
            "status": "Analyzed",
            "citationsCount": 96,
            "pdfSize": "3.1 MB",
            "addedAt": "2026-03-11",
            "original_text": "Hallucinated citations and fictitious numerical claims pose catastrophic risks in scientific AI assistants...",
            "cleaned_text": "Hallucinated citations and fictitious numerical claims pose catastrophic risks in scientific AI assistants...",
            "sections": [
                {"id": "paper-08-sec-0", "paper_id": "paper-08", "section_type": "title", "heading": "Title", "content": "Benchmarking Hallucination Mitigation Strategies in Scientific Question Answering", "page_start": 1, "page_end": 1},
                {"id": "paper-08-sec-1", "paper_id": "paper-08", "section_type": "abstract", "heading": "Abstract", "content": "Hallucinated citations and fictitious numerical claims pose catastrophic risks in scientific AI assistants. This paper presents SciFact-Bench, a diagnostic benchmark for evaluating citation precision, claim entailment, and counterfactual robustness in scientific QA.", "page_start": 1, "page_end": 1},
                {"id": "paper-08-sec-2", "paper_id": "paper-08", "section_type": "methodology", "heading": "Methodology", "content": "Adversarial perturbation of scientific claims, counterfactual citation insertion, and multi-annotator fact-checking verification across biology, physics, and computer science.", "page_start": 2, "page_end": 5},
                {"id": "paper-08-sec-3", "paper_id": "paper-08", "section_type": "results", "heading": "Results", "content": "Post-hoc verification pipelines reduce fictitious citations by 81% compared to greedy decoding.", "page_start": 6, "page_end": 8}
            ]
        }
    ]

    for p in initial_papers:
        if not get_paper(p["id"]):
            sections = p.pop("sections", [])
            save_paper(p, sections)
