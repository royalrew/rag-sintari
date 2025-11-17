"""FastAPI HTTP layer for RAG system."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid
import os

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from rag.index_store import load_index
from rag.error_handling import register_exception_handlers


# Pydantic models
class Source(BaseModel):
    document_name: str
    page_number: int
    snippet: str


class QueryRequest(BaseModel):
    query: str = Field(..., description="Frågan att ställa till RAG-motorn")
    workspace: str = Field(default="default", description="Workspace-id")
    doc_ids: Optional[List[str]] = Field(default=None, description="Filtrera på specifika dokument")
    mode: str = Field(default="answer", description="answer | summary | extract")
    verbose: bool = Field(default=False, description="Aktivera debug-output")


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    mode: str
    latency_ms: float
    workspace: str


class HealthResponse(BaseModel):
    status: str
    workspace: str
    indexed_chunks: int
    version: str


# FastAPI app
app = FastAPI(
    title="RAG-motorn API",
    description="Svenskt RAG-system med hybrid retrieval och disk-cache",
    version="1.0.0",
)

# Register global error handlers
register_exception_handlers(app)

# CORS (för frontend)
# Läs allowed origins från environment, fallback till wildcard för utveckling
allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "*")
if allowed_origins_str == "*":
    allowed_origins = ["*"]
else:
    # Kommaseparerade origins från env, t.ex. "https://example.com,https://app.example.com"
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
)

# Global state
_engine: Optional[RAGEngine] = None
_loaded_workspace: str = ""
_indexed_chunks: int = 0
_engines: Dict[str, RAGEngine] = {}  # Cache engines per workspace


def _load_engine_for_workspace(workspace: str) -> RAGEngine:
    """Ladda eller hämta cached RAGEngine för en workspace."""
    global _engines
    
    # Returnera cached engine om den finns
    if workspace in _engines:
        return _engines[workspace]
    
    cfg = load_config()
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    
    # Ladda index från cache
    cache = load_index(workspace, cache_dir)
    if not cache:
        print(f"[api] VARNING: Ingen cache för workspace '{workspace}'")
        # Skapa tom engine
        idx = InMemoryIndex()
        emb = EmbeddingsClient()
        retriever = Retriever(index=idx, embeddings_client=emb)
        engine = RAGEngine(retriever=retriever)
        _engines[workspace] = engine
        return engine
    
    # Bygg InMemoryIndex från cache
    idx = InMemoryIndex()
    items: List[IndexItem] = []
    for i, meta in enumerate(cache["chunks_meta"]):
        items.append(
            IndexItem(
                id=meta["chunk_id"],
                embedding=cache["embeddings"][i],
                metadata=meta,
            )
        )
    idx.add(items)
    
    emb = EmbeddingsClient()
    retriever = Retriever(index=idx, embeddings_client=emb)
    engine = RAGEngine(retriever=retriever)
    _engines[workspace] = engine
    
    print(f"[api] Laddade RAGEngine för workspace '{workspace}' med {len(items)} chunks")
    return engine


@app.on_event("startup")
async def startup_event():
    """Ladda default workspace vid startup."""
    global _engine, _loaded_workspace, _indexed_chunks
    
    _engine = _load_engine_for_workspace("default")
    _loaded_workspace = "default"
    
    # Räkna chunks för default workspace
    cache = load_index("default", "index_cache")
    _indexed_chunks = len(cache["chunks_meta"]) if cache else 0


@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint."""
    return {
        "message": "RAG-motorn API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    # Räkna totala chunks från alla laddade workspaces
    total_chunks = 0
    cfg = load_config()
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    default_cache = load_index("default", cache_dir)
    if default_cache:
        total_chunks = len(default_cache["chunks_meta"])
    
    return HealthResponse(
        status="healthy" if _engine else "not_ready",
        workspace="default",
        indexed_chunks=total_chunks,
        version="1.0.0",
    )


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest, http_request: Request):
    """
    Ställ en fråga till RAG-motorn.
    
    **Exempel:**
    ```json
    {
      "query": "Vad stöder RAG-motorn?",
      "workspace": "default",
      "mode": "answer"
    }
    ```
    """
    # Ladda engine för rätt workspace
    workspace = request.workspace or "default"
    engine = _load_engine_for_workspace(workspace)
    
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAGEngine inte redo. Kör indexering först.",
        )
    
    # Generera request_id för logging
    request_id = str(uuid.uuid4())
    # Lägg request_id i Request.state så att error handlers kan läsa den
    http_request.state.request_id = request_id
    
    start = time.perf_counter()
    
    try:
        result = engine.answer_question(
            question=request.query,
            mode=request.mode,
            workspace_id=workspace,
            document_ids=request.doc_ids,
            verbose=request.verbose,
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        )
    
    end = time.perf_counter()
    latency_ms = (end - start) * 1000
    
    # Konvertera till Pydantic-modell
    sources = [
        Source(
            document_name=s["document_name"],
            page_number=s["page_number"],
            snippet=s["snippet"],
        )
        for s in result.get("sources", [])
    ]
    
    return QueryResponse(
        answer=result.get("answer", ""),
        sources=sources,
        mode=result.get("mode", request.mode),
        latency_ms=latency_ms,
        workspace=workspace,
    )


# För lokal körning
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

