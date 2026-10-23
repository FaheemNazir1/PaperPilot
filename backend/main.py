import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Dict, Optional
from fastapi import Depends
from backend.auth.firebase_auth import get_optional_current_user
from backend.db.database import get_db_connection, get_user_stats, init_db, seed_default_papers
from backend.routers.auth import router as auth_router
from backend.routers.papers import router as papers_router
from backend.routers.review import router as review_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema and seed mock papers if fresh
    init_db()
    seed_default_papers()
    yield


app = FastAPI(
    title="PaperPilot API",
    description="Backend for PaperPilot: authenticated scientific paper upload and library management",
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
app.include_router(auth_router, prefix="/api/v1")
app.include_router(papers_router, prefix="/api/v1")
app.include_router(review_router, prefix="/api/v1")


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "PaperPilot API",
        "version": "1.0.0",
    }


@app.get("/api/v1/stats")
def get_stats(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Returns real aggregate stats from the SQLite database isolated by user."""
    user_id = current_user["id"] if current_user else None
    return get_user_stats(user_id=user_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
