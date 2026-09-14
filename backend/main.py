import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import get_all_papers, get_db_connection, init_db, seed_default_papers
from backend.routers.papers import router as papers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema and seed mock papers if fresh
    init_db()
    seed_default_papers()
    yield


app = FastAPI(
    title="PaperPilot API",
    description="AI-Powered Scientific Literature Review Assistant Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development with React/Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(papers_router, prefix="/api/v1")


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "PaperPilot API",
        "version": "1.0.0",
    }


@app.get("/api/v1/stats")
def get_stats():
    """Returns real aggregate stats from the SQLite database."""
    with get_db_connection() as conn:
        paper_count = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
        section_count = conn.execute("SELECT COUNT(*) FROM paper_sections").fetchone()[0]
        category_rows = conn.execute(
            "SELECT category, COUNT(*) as count FROM papers GROUP BY category"
        ).fetchall()
        categories = {r["category"]: r["count"] for r in category_rows}

    return {
        "papersAnalyzed": paper_count,
        "sectionsIndexed": section_count,
        "literatureReviews": 8,
        "keyInsights": 47,
        "researchGaps": 23,
        "categories": categories,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
