import os
from contextlib import asynccontextmanager

from backend.config import load_env_files

# Must run before the imports below: some of them read environment variables when imported.
load_env_files()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Dict, Optional
from fastapi import Depends
from backend.auth.firebase_auth import get_optional_current_user
from backend.db.database import get_db_connection, get_user_stats, init_db, seed_default_papers
from backend.routers.auth import router as auth_router
from backend.routers.chat import router as chat_router
from backend.routers.papers import router as papers_router
from backend.routers.review import router as review_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema and seed mock papers if fresh
    init_db()
    seed_default_papers()
    # Config summary for the terminal; never includes the key itself.
    from backend.chat import llm

    print(f"Research Mentor: Gemini key {'present' if llm.is_configured() else 'MISSING'}, model {llm.model_name()}", flush=True)
    yield


app = FastAPI(
    title="PaperPilot API",
    description="Backend for PaperPilot: authenticated scientific paper upload and library management",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development with React/Vite
# CORS_ORIGINS="https://your-app.vercel.app,http://localhost:5173" restricts browser access to those
# origins; unset keeps the permissive development default. Auth uses a Bearer header, not cookies.
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(papers_router, prefix="/api/v1")
app.include_router(review_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/api/health")
def health_check(deep: bool = False):
    # Public, so it carries only booleans and the embedding backend's name: never keys, model names or paths.
    from backend.chat import embeddings, llm
    from backend.services import summarizer

    mentor_flags = {
        "geminiKeyConfigured": llm.is_configured(),
        "modelConfigured": bool(os.getenv("GEMINI_MODEL", "").strip()),
        "fallbackModelConfigured": llm.fallback_model_name() is not None,
        "embeddingBackend": embeddings.backend_name(),
    }
    if deep and llm.is_configured():
        # One tiny real generation + embedding, cached for 10 minutes; reports only pass/fail and a failure kind.
        from backend.chat import selfcheck

        mentor_flags["selfCheck"] = selfcheck.run()

    return {
        "status": "online",
        "service": "PaperPilot API",
        "version": "1.0.0",
        "features": {
            "researchMentor": mentor_flags,
            "summarizer": {"modelInstalled": summarizer.is_configured()},
            "persistentStorage": bool(os.getenv("PAPERPILOT_DATA_DIR", "").strip()),
            "corsRestricted": _cors_origins != ["*"],
        },
    }


@app.get("/api/v1/stats")
def get_stats(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Returns real aggregate stats from the SQLite database isolated by user."""
    user_id = current_user["id"] if current_user else None
    return get_user_stats(user_id=user_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
