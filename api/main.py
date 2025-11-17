"""FastAPI HTTP layer for RAG system."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, status, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid
import os
import hashlib
import tempfile
from datetime import datetime, timezone
import numpy as np
from rank_bm25 import BM25Okapi

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from rag.index_store import load_index, save_index
from rag.store import Store
from rag.error_handling import register_exception_handlers
from ingest.text_extractor import extract_text
from ingest.chunker import chunk_text


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


class UploadResponse(BaseModel):
    success: bool
    document_id: str
    document_name: str
    chunks_created: int
    message: str


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


@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    workspace: str = Form(default="default"),
):
    """
    Ladda upp och indexera ett dokument.
    
    **Exempel:**
    ```bash
    curl -X POST http://localhost:8000/upload \\
      -F "file=@document.pdf" \\
      -F "workspace=default"
    ```
    """
    # Verifiera filtyp
    allowed_extensions = {".txt", ".md", ".pdf", ".docx"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filtyp {file_ext} stöds inte. Tillåtna: {', '.join(allowed_extensions)}",
        )
    
    # Läs config
    cfg = load_config()
    chunk_cfg = cfg.get("chunking", {}) or {}
    target_tokens = int(chunk_cfg.get("target_tokens", 600))
    overlap_tokens = int(chunk_cfg.get("overlap_tokens", 120))
    
    persistence_cfg = cfg.get("persistence", {}) or {}
    db_path = persistence_cfg.get("sqlite_path", "./.rag_state/rag.sqlite")
    
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    
    # Spara fil temporärt
    temp_file = None
    try:
        # Skapa temporär fil
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            temp_file = tmp.name
            content = await file.read()
            tmp.write(content)
        
        # Extrahera text
        try:
            text, _ = extract_text(temp_file)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kunde inte extrahera text från fil: {str(e)}",
            )
        
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filen innehåller ingen text",
            )
        
        # Chunk text
        chunks = chunk_text(text, target_tokens, overlap_tokens)
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kunde inte skapa chunks från dokumentet",
            )
        
        # Generera embeddings
        emb_client = EmbeddingsClient()
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = emb_client.embed_texts(chunk_texts)
        
        # Skapa document_id
        doc_id = hashlib.sha1(f"{workspace}:{file.filename}".encode("utf-8")).hexdigest()
        mtime = str(int(os.path.getmtime(temp_file)))
        
        # Spara till SQLite
        store = Store(db_path=db_path)
        try:
            version = int(os.path.getmtime(temp_file))
        except Exception:
            version = 1
        
        store.upsert_document(
            doc_id=doc_id,
            name=file.filename,
            version=version,
            workspace_id=workspace,
            mtime=mtime,
        )
        
        # Spara chunks
        now_iso = datetime.now(timezone.utc).isoformat()
        chunk_rows = []
        all_chunks_meta = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}-chunk-{i+1}"
            chunk_rows.append((
                chunk_id,
                doc_id,
                chunk["text"],
                1,  # page_number
                now_iso,
            ))
            all_chunks_meta.append({
                "chunk_id": chunk_id,
                "document_name": file.filename,
                "document_path": temp_file,
                "document_mtime": mtime,
                "text": chunk["text"],
                "page_number": 1,
                "workspace_id": workspace,
            })
        
        store.upsert_chunks(chunk_rows)
        
        # Ladda befintlig cache för workspace
        existing_cache = load_index(workspace, cache_dir)
        existing_embeddings = None
        existing_chunks_meta = []
        
        if existing_cache:
            existing_embeddings = existing_cache["embeddings"]
            existing_chunks_meta = existing_cache["chunks_meta"]
        
        # Kombinera med nya chunks
        new_embeddings_array = np.array(embeddings, dtype=float)
        if existing_embeddings is not None and len(existing_embeddings) > 0:
            # existing_embeddings är redan en numpy array från load_index
            if isinstance(existing_embeddings, np.ndarray):
                all_embeddings = np.vstack([existing_embeddings, new_embeddings_array])
            else:
                # Fallback om det är en lista
                all_embeddings = np.vstack([np.array(existing_embeddings, dtype=float), new_embeddings_array])
        else:
            all_embeddings = new_embeddings_array
        
        all_chunks_meta_combined = existing_chunks_meta + all_chunks_meta
        
        # Bygg BM25-index för alla chunks
        all_chunk_texts = [c["text"] for c in all_chunks_meta_combined]
        tokenized_texts = [t.split() for t in all_chunk_texts]
        bm25 = BM25Okapi(tokenized_texts)
        
        # Spara till disk-cache
        save_index(
            workspace=workspace,
            embeddings=all_embeddings,
            chunks_meta=all_chunks_meta_combined,
            bm25_obj=bm25,
            base_dir=cache_dir,
        )
        
        # Invalidera cached engine så den laddas om nästa gång
        if workspace in _engines:
            del _engines[workspace]
        
        return UploadResponse(
            success=True,
            document_id=doc_id,
            document_name=file.filename,
            chunks_created=len(chunks),
            message=f"Dokument indexerat: {len(chunks)} chunks skapade",
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )
    finally:
        # Rensa temporär fil
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except Exception:
                pass


# För lokal körning
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

