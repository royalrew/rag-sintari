"""FastAPI HTTP layer for RAG system."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, status, Request, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid
import os
import hashlib
import tempfile
import json
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
from rag.query_logger import DEFAULT_LOG_PATH
from ingest.text_extractor import extract_text
from ingest.chunker import chunk_text
from agents.gdpr_agent import GDPRAgent, GDPRReport
from agents.audit_agent import AuditAgent, AuditReport
from rag.compliance_score import ComplianceScoreEngine, ComplianceScore
from api.documents_db import get_documents_db
from api.auth import (
    get_current_user_id,
    get_current_user_id_optional,
    create_access_token,
    get_password_hash,
    verify_password,
)
from api.users_db import get_users_db
from api.plan_checker import check_plan, get_usage_stats
from api.usage_db import get_usage_db
from api.billing import (
    create_checkout_session,
    create_portal_session,
    get_subscription_info,
    handle_stripe_webhook,
    CheckoutRequest,
    CheckoutResponse,
    PortalRequest,
    PortalResponse,
    SubscriptionInfoResponse,
)
from api.credits_endpoints import (
    get_credits_balance,
    get_credits_history,
    create_credits_checkout,
    CreditsBalanceResponse,
    CreditsHistoryResponse,
    CheckoutRequest as CreditsCheckoutRequest,
    CheckoutResponse as CreditsCheckoutResponse,
)

# R2 client functions
try:
    from api.r2_client import upload_fileobj, generate_presigned_url, delete_object, object_exists
    R2_DELETE_AVAILABLE = True
except ImportError:
    R2_DELETE_AVAILABLE = False
    delete_object = None

# Optional R2 client import
try:
    from api.r2_client import upload_fileobj, object_exists
    R2_AVAILABLE = True
except ImportError:
    R2_AVAILABLE = False
    upload_fileobj = None
    object_exists = None


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
    no_answer: bool = False  # True om svaret är "Jag hittar inte svaret i källorna"


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


class StatsResponse(BaseModel):
    total_documents: int
    total_workspaces: int
    total_queries: int
    accuracy: float  # Träffsäkerhet i %


class RecentQuery(BaseModel):
    id: str
    query: str
    timestamp: str
    workspace: Optional[str] = None
    mode: Optional[str] = None
    success: bool = True


class RecentQueriesResponse(BaseModel):
    queries: List[RecentQuery]


class WorkspaceActivity(BaseModel):
    workspace_id: str
    last_active: Optional[str] = None  # ISO timestamp
    query_count: int = 0


# Auth models
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: str


class AuthResponse(BaseModel):
    user: UserResponse
    accessToken: str


class DocumentMetadata(BaseModel):
    id: int
    filename: str
    storage_key: str
    created_at: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None


class DocumentUploadResponse(BaseModel):
    ok: bool
    document: DocumentMetadata
    message: str


class DocumentsListResponse(BaseModel):
    documents: List[DocumentMetadata]


# FastAPI app
app = FastAPI(
    title="RAG-motorn API",
    description="Svenskt RAG-system med hybrid retrieval och disk-cache",
    version="1.0.0",
)

# Register global error handlers
register_exception_handlers(app)

# CORS (för frontend)
origins = [
    "https://www.sintari.se",
    "https://sintari.se",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
    index_source = cache.get("index_source", "unknown") if cache else "none"
    
    if not cache:
        print(f"[api] VARNING: Ingen cache för workspace '{workspace}' [index] source=none")
        # Skapa tom engine
        idx = InMemoryIndex()
        emb = EmbeddingsClient()
        retriever = Retriever(index=idx, embeddings_client=emb)
        engine = RAGEngine(retriever=retriever)
        _engines[workspace] = engine
        return engine
    
    # Bygg InMemoryIndex från cache
    # Hantera både gammalt format (lista) och nytt format (dict med timestamp)
    chunks_meta = cache.get("chunks_meta", [])
    if not isinstance(chunks_meta, list):
        # Om chunks_meta är en dict (gammalt cache-format), använd direkt
        chunks_meta = cache.get("chunks_meta", [])
    
    idx = InMemoryIndex()
    items: List[IndexItem] = []
    for i, meta in enumerate(chunks_meta):
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
    
    indexed_info = f" indexed={cache.get('indexed_at_iso')}" if cache.get('indexed_at_iso') else ""
    print(f"[api] Laddade RAGEngine för workspace '{workspace}' med {len(items)} chunks [index] source={index_source}{indexed_info}")
    return engine


@app.on_event("startup")
async def startup_event():
    """Ladda default workspace vid startup."""
    global _engine, _loaded_workspace, _indexed_chunks
    
    # Logga workspace-översikt från databas (viktigt för prod-debugging)
    try:
        from rag.store import Store
        store = Store()
        workspaces = store.list_workspaces_with_stats()
        if workspaces:
            print("[API][STARTUP] =========================================")
            print("[API][STARTUP] Workspace-översikt (viktigt för prod-debug):")
            for ws in workspaces:
                docs = store.list_documents_in_workspace(ws["workspace_id"])
                doc_names = [d["name"] for d in docs[:5]]  # Visa första 5
                print(f"[API][STARTUP]   Workspace '{ws['workspace_id']}': {ws['doc_count']} dokument, {ws['chunk_count']} chunks")
                if docs:
                    print(f"[API][STARTUP]     Dokument: {', '.join(doc_names)}{'...' if len(docs) > 5 else ''}")
                else:
                    print(f"[API][STARTUP]     ⚠️ INGA DOKUMENT!")
            print("[API][STARTUP] =========================================")
        else:
            print("[API][STARTUP] ⚠️ VARNING: Inga workspaces hittades i databasen")
    except Exception as e:
        print(f"[API][STARTUP] ⚠️ Kunde inte läsa workspace-info: {e}")
    
    _engine = _load_engine_for_workspace("default")
    _loaded_workspace = "default"
    
    # Räkna chunks för default workspace
    cfg = load_config()
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    cache = load_index("default", cache_dir)
    if cache:
        chunks_meta = cache.get("chunks_meta", [])
        if isinstance(chunks_meta, list):
            _indexed_chunks = len(chunks_meta)
        else:
            _indexed_chunks = len(chunks_meta.get("chunks_meta", []))
        index_source = cache.get("index_source", "cached")
        indexed_at_iso = cache.get("indexed_at_iso")
        index_info = f" [index] source={index_source}" + (f" indexed={indexed_at_iso}" if indexed_at_iso else "")
    else:
        _indexed_chunks = 0
        index_info = " [index] source=none"
    print(f"[API][STARTUP] Laddade default workspace med {_indexed_chunks} chunks från cache{index_info}")


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
        chunks_meta = default_cache["chunks_meta"]
        if isinstance(chunks_meta, list):
            total_chunks = len(chunks_meta)
        else:
            total_chunks = len(chunks_meta.get("chunks_meta", []))
    
    return HealthResponse(
        status="healthy" if _engine else "not_ready",
        workspace="default",
        indexed_chunks=total_chunks,
        version="1.0.0",
    )


# Debug workspace endpoint
class WorkspaceDebugResponse(BaseModel):
    workspace: str
    documents: List[Dict[str, Any]]
    chunks: int
    last_indexed: Optional[str] = None
    index_source: Optional[str] = None


@app.get("/debug-workspace", response_model=WorkspaceDebugResponse)
async def debug_workspace(
    workspace: Optional[str] = None,
    api_key: Optional[str] = None,  # Optional API key för säkerhet
):
    """
    Debug-endpoint för att se workspace-status.
    
    **Publikt för debugging, men kan skyddas med API key.**
    
    Lägg till env var `RAG_DEBUG_API_KEY` för att skydda endpointen.
    Om `RAG_DEBUG_API_KEY` är satt, måste `api_key` param matcha.
    
    Returnerar:
    - Workspace-namn
    - Lista över dokument i workspace
    - Antal chunks
    - Senaste indexeringstid (om tillgänglig)
    - Index-källa (cached / reindexed)
    """
    # Optionell API key-autentisering
    debug_api_key = os.getenv("RAG_DEBUG_API_KEY")
    if debug_api_key and api_key != debug_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key for debug endpoint. Set ?api_key=YOUR_KEY",
        )
    workspace_id = workspace or "default"
    
    try:
        from rag.store import Store
        store = Store()
        
        # Hämta dokument i workspace
        documents = store.list_documents_in_workspace(workspace_id)
        
        # Hämta cache-info
        cfg = load_config()
        storage_cfg = cfg.get("storage", {})
        cache_dir = storage_cfg.get("index_dir", "index_cache")
        cache = load_index(workspace_id, cache_dir)
        
        chunks = 0
        last_indexed = None
        index_source = None
        
        if cache:
            chunks_meta = cache.get("chunks_meta", [])
            if isinstance(chunks_meta, list):
                chunks = len(chunks_meta)
            else:
                chunks = len(chunks_meta.get("chunks_meta", []))
            
            last_indexed = cache.get("indexed_at_iso")
            index_source = cache.get("index_source", "cached")
        
        return WorkspaceDebugResponse(
            workspace=workspace_id,
            documents=documents,
            chunks=chunks,
            last_indexed=last_indexed,
            index_source=index_source,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workspace debug info: {str(e)}",
        )


# Admin endpoint för re-indexering
class ReindexRequest(BaseModel):
    workspace: Optional[str] = "default"
    force: bool = False  # Force reindex även om cache är fresh


class ReindexResponse(BaseModel):
    success: bool
    workspace: str
    documents: int
    chunks: int
    message: str
    indexed_at: Optional[str] = None


@app.post("/admin/reindex-workspace", response_model=ReindexResponse)
async def reindex_workspace(
    request: ReindexRequest,
    api_key: Optional[str] = None,  # Optional API key för säkerhet
):
    """
    Re-indexera en workspace.
    
    Detta kör samma logik som `scripts/index_workspace.py` men via API.
    Användbart för admin-UI där man kan trycka på "Reindex"-knapp.
    
    **OBS:** Detta kräver att dokument redan finns i R2/storage.
    För att ladda upp dokument först, använd `/documents/upload`.
    
    **Publikt för debugging, men kan skyddas med API key.**
    Lägg till env var `RAG_DEBUG_API_KEY` för att skydda endpointen.
    """
    # Optionell API key-autentisering
    debug_api_key = os.getenv("RAG_DEBUG_API_KEY")
    if debug_api_key and api_key != debug_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key for reindex endpoint",
        )
    
    workspace_id = request.workspace or "default"
    
    try:
        import subprocess
        import sys
        from pathlib import Path
        
        # Kör index_workspace.py som subprocess
        # För att kunna reindex måste vi veta var dokumenten ligger
        # För nu antar vi att de ligger i R2/storage och måste läsas därifrån
        # Detta är en förenklad version - i produktion skulle vi läsa från R2 direkt
        
        # För enkelhetens skull, låt oss göra en enkel implementation
        # som bara markerar att indexering behövs eller kör faktisk indexering
        
        # TODO: Implementera faktisk reindexing från R2/storage
        # För nu returnerar vi bara att det inte är implementerat ännu
        
        return ReindexResponse(
            success=False,
            workspace=workspace_id,
            documents=0,
            chunks=0,
            message="Re-indexering via API är inte implementerat än. Använd 'scripts/index_workspace.py' eller CLI för nu.",
            indexed_at=None,
        )
        
        # När implementerat skulle det vara:
        # 1. Hämta dokument från R2/storage för workspace
        # 2. Kör extract_text, chunk_text, embeddings
        # 3. Spara till cache med save_index (som nu inkluderar timestamp)
        # 4. Invalidera cached engine så den laddas om
        # 5. Returnera success med antal dokument och chunks
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reindex workspace: {str(e)}",
        )


@app.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    http_request: Request,
    user_id: int = Depends(get_current_user_id),
):
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
    # Check plan limits and credits
    check_plan(user_id, "query")
    
    # Ladda engine för rätt workspace
    workspace = request.workspace or "default"
    
    # Logga workspace-info för debugging (viktigt för prod)
    try:
        from rag.store import Store
        store = Store()
        doc_count = store.count_documents(workspace)
        
        # Kolla cache-info
        cache = load_index(workspace, "index_cache")
        index_source = cache.get("index_source", "unknown") if cache else "none"
        indexed_at_iso = cache.get("indexed_at_iso") if cache else None
        
        print(f"[API][QUERY] workspace={workspace} docs_in_ws={doc_count} query='{request.query[:50]}...' user_id={user_id} [index] source={index_source}" + (f" indexed={indexed_at_iso}" if indexed_at_iso else ""))
        
        # Visa dokumentnamn i workspace om verbose
        if verbose_mode:
            docs = store.list_documents_in_workspace(workspace)
            doc_names = [d["name"] for d in docs]
            print(f"[API][QUERY][VERBOSE] Dokument i workspace '{workspace}': {doc_names}")
    except Exception as e:
        print(f"[API][QUERY] Kunde inte läsa workspace-info: {e}")
    
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
    
    # Aktivera verbose logging i prod för debugging (kan skruvas av senare via env var)
    verbose_mode = request.verbose or os.getenv("RAG_VERBOSE_PROD", "false").lower() == "true"
    
    try:
        result = engine.answer_question(
            question=request.query,
            mode=request.mode,
            workspace_id=workspace,
            document_ids=request.doc_ids,
            verbose=verbose_mode,  # Använd verbose_mode (kan aktiveras via env)
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        )
    
    end = time.perf_counter()
    latency_ms = (end - start) * 1000
    
    # Deduct credits after successful query
    from api.plan_checker import deduct_credits
    from api.credits import calculate_query_cost
    cost = calculate_query_cost()
    deduct_credits(user_id, cost, f"Query: {request.query[:50]}")
    
    # Log usage after successful query
    usage_db = get_usage_db()
    usage_db.log_usage(user_id, "query")
    
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
        no_answer=result.get("no_answer", False),
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
    
    from api.db_config import db_path as state_db
    persistence_cfg = cfg.get("persistence", {}) or {}
    db_path = persistence_cfg.get("sqlite_path") or state_db("rag.sqlite")
    
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
            existing_chunks_meta_raw = existing_cache.get("chunks_meta", [])
            # Hantera både gamla och nya format
            if isinstance(existing_chunks_meta_raw, list):
                existing_chunks_meta = existing_chunks_meta_raw
            else:
                existing_chunks_meta = existing_chunks_meta_raw.get("chunks_meta", [])
        
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


@app.get("/stats", response_model=StatsResponse)
async def get_stats(workspace: Optional[str] = None):
    """
    Hämta statistik: antal dokument, arbetsytor, frågor och träffsäkerhet.
    
    **Query params:**
    - `workspace` (optional): Filtrera på specifik workspace
    """
    cfg = load_config()
    from api.db_config import db_path as state_db
    persistence_cfg = cfg.get("persistence", {}) or {}
    db_path = persistence_cfg.get("sqlite_path") or state_db("rag.sqlite")
    
    store = Store(db_path=db_path)
    
    # Räkna dokument
    total_documents = store.count_documents(workspace_id=workspace)
    
    # Räkna aktiva arbetsytor (arbetsytor som har dokument)
    if workspace:
        # Om workspace har dokument, räkna som aktiv
        total_workspaces = 1 if total_documents > 0 else 0
    else:
        # Räkna arbetsytor som har minst 1 dokument
        workspace_list = store.list_workspaces()
        active_count = 0
        for ws_id in workspace_list:
            doc_count = store.count_documents(workspace_id=ws_id)
            if doc_count > 0:
                active_count += 1
        total_workspaces = active_count
    
    # Räkna frågor från query log
    log_path = DEFAULT_LOG_PATH
    total_queries = 0
    successful_queries = 0
    
    if log_path.exists():
        try:
            with log_path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        # Filtrera på workspace om angivet
                        if workspace:
                            meta = record.get("meta", {})
                            workspace_id = meta.get("workspace_id") or meta.get("workspace")
                            if workspace_id != workspace:
                                continue
                        total_queries += 1
                        if record.get("success", True):
                            successful_queries += 1
                    except json.JSONDecodeError:
                        continue
        except Exception:
            pass
    
    # Beräkna träffsäkerhet (accuracy)
    accuracy = (successful_queries / total_queries * 100) if total_queries > 0 else 0.0
    
    return StatsResponse(
        total_documents=total_documents,
        total_workspaces=total_workspaces,
        total_queries=total_queries,
        accuracy=round(accuracy, 1),
    )


@app.get("/recent-queries", response_model=RecentQueriesResponse)
async def get_recent_queries(
    limit: int = 10,
    workspace: Optional[str] = None,
):
    """
    Hämta senaste frågor från query log.
    
    **Query params:**
    - `limit` (default: 10): Max antal frågor att returnera
    - `workspace` (optional): Filtrera på specifik workspace
    """
    log_path = DEFAULT_LOG_PATH
    queries: List[RecentQuery] = []
    
    if not log_path.exists():
        return RecentQueriesResponse(queries=[])
    
    try:
        # Läs alla rader och sortera på timestamp
        all_records = []
        with log_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    # Filtrera på workspace om angivet
                    if workspace:
                        meta = record.get("meta", {})
                        workspace_id = meta.get("workspace_id") or meta.get("workspace")
                        if workspace_id != workspace:
                            continue
                    all_records.append(record)
                except json.JSONDecodeError:
                    continue
        
        # Sortera på timestamp (nyaste först)
        all_records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Ta de senaste N
        for record in all_records[:limit]:
            queries.append(RecentQuery(
                id=record.get("request_id", str(uuid.uuid4())),
                query=record.get("query", ""),
                timestamp=record.get("timestamp", ""),
                workspace=record.get("meta", {}).get("workspace_id") or record.get("meta", {}).get("workspace"),
                mode=record.get("mode"),
                success=record.get("success", True),
            ))
    
    except Exception as e:
        print(f"[api] Error reading query log: {e}")
    
    return RecentQueriesResponse(queries=queries)


@app.get("/workspace-activity", response_model=Dict[str, WorkspaceActivity])
async def get_workspace_activity():
    """
    Hämta senaste aktivitet för alla workspaces.
    Returnerar en dict med workspace_id som key och WorkspaceActivity som value.
    """
    log_path = DEFAULT_LOG_PATH
    activity_map: Dict[str, WorkspaceActivity] = {}
    
    if not log_path.exists():
        return {}
    
    try:
        # Läs alla queries och gruppera per workspace
        with log_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    meta = record.get("meta", {})
                    workspace_id = meta.get("workspace_id") or meta.get("workspace") or "default"
                    timestamp = record.get("timestamp")
                    
                    if workspace_id not in activity_map:
                        activity_map[workspace_id] = WorkspaceActivity(
                            workspace_id=workspace_id,
                            last_active=None,
                            query_count=0,
                        )
                    
                    activity = activity_map[workspace_id]
                    activity.query_count += 1
                    
                    # Uppdatera senaste aktivitet om denna är nyare
                    if timestamp:
                        if not activity.last_active or timestamp > activity.last_active:
                            activity.last_active = timestamp
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"[api] Error reading activity from query log: {e}")
    
    return {ws_id: activity for ws_id, activity in activity_map.items()}


# Auth endpoints
@app.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user.
    """
    db = get_users_db()
    
    # Check if user already exists
    existing_user = db.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(request.password)
    
    try:
        user_data = db.create_user(
            email=request.email,
            name=request.name,
            hashed_password=hashed_password,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user_data["id"])})
    
    return AuthResponse(
        user=UserResponse(**user_data),
        accessToken=access_token
    )


@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user and return access token.
    """
    db = get_users_db()
    
    # Get user by email
    user = db.get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    # Return user without password
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
    )
    
    return AuthResponse(
        user=user_response,
        accessToken=access_token
    )


class UserWithUsageResponse(BaseModel):
    id: int
    email: str
    name: str
    plan: str
    created_at: str
    usage: Dict[str, Any]


@app.get("/auth/me", response_model=UserWithUsageResponse)
async def get_me(user_id: int = Depends(get_current_user_id)):
    """
    Get current authenticated user with usage statistics.
    """
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get usage stats
    usage_stats = get_usage_stats(user_id)
    
    return UserWithUsageResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        plan=user.get("plan", "start"),
        created_at=user["created_at"],
        usage=usage_stats,
    )


@app.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    """
    Ladda upp dokument till Cloudflare R2 och spara metadata i databasen.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Ingen fil mottagen")

    if not R2_AVAILABLE or upload_fileobj is None:
        raise HTTPException(
            status_code=503,
            detail="R2 storage är inte tillgängligt. Kontrollera att boto3 är installerat och R2-miljövariabler är satta."
        )

    filename = file.filename or "unnamed"
    content_type = file.content_type or "application/octet-stream"
    
    # Check plan limits
    file_ext = os.path.splitext(filename)[1]
    
    # Beräkna filstorlek och uppskatta sidor
    size_bytes = None
    estimated_pages = 1  # Default to 1 page
    try:
        # Spara nuvarande position
        current_pos = file.file.tell()
        # Gå till slutet för att få storlek
        file.file.seek(0, 2)  # Seek to end
        size_bytes = file.file.tell()
        # Återställ position
        file.file.seek(current_pos)
        
        # Validera att filen inte är tom (troligen molntjänst-strul)
        if size_bytes == 0:
            print(f"[upload] Rejected empty file from user {user_id} (troligen molnstrul: {filename})")
            raise HTTPException(
                status_code=400,
                detail="Filen är tom (size 0). Det verkar som att filen inte är helt nedladdad från din molntjänst. Öppna filen i din moln-app (OneDrive / iCloud / Google Drive), se till att den är tillgänglig offline och försök igen."
            )
        
        # Uppskatta sidor baserat på filstorlek (rough estimate: ~50KB per sida)
        if size_bytes:
            estimated_pages = max(1, int(size_bytes / 50000))
    except HTTPException:
        # Re-raise HTTPExceptions (vårt tom-fil-fel)
        raise
    except Exception:
        # Om vi inte kan beräkna storlek, fortsätt ändå
        # Men vi försöker fortfarande validera size_bytes om vi fick den
        if size_bytes == 0:
            print(f"[upload] Rejected empty file from user {user_id} (troligen molnstrul: {filename})")
            raise HTTPException(
                status_code=400,
                detail="Filen är tom (size 0). Det verkar som att filen inte är helt nedladdad från din molntjänst. Öppna filen i din moln-app (OneDrive / iCloud / Google Drive), se till att den är tillgänglig offline och försök igen."
            )
        pass
    
    # Check credits for indexing (will be deducted after successful upload)
    check_plan(user_id, "upload_document", extension=file_ext, pages=estimated_pages)

    # Upload till R2
    storage_key = None
    try:
        storage_key = upload_fileobj(
            fileobj=file.file,
            user_id=user_id,
            filename=filename,
            content_type=content_type,
        )
    except RuntimeError as e:
        # R2 konfigurationsfel
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Övriga fel
        import traceback
        error_detail = f"Kunde inte ladda upp fil: {str(e)}"
        print(f"[upload] Error: {error_detail}")
        print(f"[upload] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

    # Spara metadata i databasen
    # TODO: Eventuell städrutin senare för dokument som laddats upp men inte sparats i DB
    document_data = None
    try:
        db = get_documents_db()
        document_data = db.create_document(
            user_id=user_id,
            filename=filename,
            storage_key=storage_key,
            content_type=content_type,
            size_bytes=size_bytes,
        )
    except Exception as e:
        # Logga felet men svara ändå med ok: true + storage_key
        # så vi inte tappar kopplingen helt
        import traceback
        print(f"[upload] VARNING: Kunde inte spara metadata i DB: {str(e)}")
        print(f"[upload] Traceback: {traceback.format_exc()}")
        # Skapa en minimal response utan DB-id
        document_data = {
            "id": 0,  # Placeholder
            "user_id": user_id,
            "filename": filename,
            "storage_key": storage_key,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    # Deduct credits after successful upload
    from api.plan_checker import deduct_credits
    from api.credits import calculate_indexing_cost
    cost = calculate_indexing_cost(estimated_pages)
    deduct_credits(user_id, cost, f"Indexering: {filename}")
    
    # Log usage after successful upload
    usage_db = get_usage_db()
    usage_db.log_usage(user_id, "upload")

    return DocumentUploadResponse(
        ok=True,
        document=DocumentMetadata(**document_data),
        message="Upload till Cloudflare R2 lyckades"
    )


@app.get("/documents", response_model=DocumentsListResponse)
async def list_documents(
    limit: Optional[int] = None,
    user_id: int = Depends(get_current_user_id),
):
    """
    Hämta alla dokument för den inloggade användaren.
    Sorterade på created_at DESC.
    
    **Query params:**
    - `limit` (optional): Max antal dokument att returnera
    """
    
    try:
        db = get_documents_db()
        documents = db.get_documents_by_user(user_id=user_id, limit=limit)
        
        return DocumentsListResponse(
            documents=[DocumentMetadata(**doc) for doc in documents]
        )
    except Exception as e:
        import traceback
        print(f"[documents] Error: {str(e)}")
        print(f"[documents] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte hämta dokument: {str(e)}"
        )


class DocumentDownloadResponse(BaseModel):
    ok: bool
    url: str
    filename: str


@app.get("/documents/{document_id}/download", response_model=DocumentDownloadResponse)
async def download_document(
    document_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """
    Hämta presigned URL för att ladda ner ett dokument.
    """
    db = get_documents_db()
    doc = db.get_document_by_id(document_id)
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument hittades inte"
        )
    
    # Kontrollera att användaren äger dokumentet
    if doc["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Du har inte behörighet att ladda ner detta dokument"
        )
    
    # Generera presigned URL
    try:
        if not R2_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="R2 storage är inte tillgängligt"
            )
        
        storage_key = doc["storage_key"]
        print(f"[download] Generating presigned URL for document_id={document_id}, storage_key={storage_key}, user_id={user_id}")
        
        # Kontrollera att filen faktiskt finns i R2
        if not object_exists(storage_key):
            print(f"[download] WARNING: File does not exist in R2: {storage_key}")
            raise HTTPException(
                status_code=404,
                detail=f"Dokumentet finns inte i lagringen. Storage key: {storage_key}"
            )
        
        url = generate_presigned_url(storage_key)
        print(f"[download] Generated presigned URL (first 50 chars): {url[:50]}...")
        
        return DocumentDownloadResponse(
            ok=True,
            url=url,
            filename=doc["filename"]
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        import traceback
        print(f"[download] Error: {str(e)}")
        print(f"[download] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte generera download-URL: {str(e)}"
        )


@app.delete("/documents/{document_id}")
async def delete_document_endpoint(
    document_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """
    Ta bort ett dokument (både från R2 och databasen).
    """
    db = get_documents_db()
    doc = db.get_document_by_id(document_id)
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument hittades inte"
        )
    
    # Kontrollera att användaren äger dokumentet
    if doc["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Du har inte behörighet att radera detta dokument"
        )
    
    # Ta bort fil i R2
    try:
        if R2_DELETE_AVAILABLE and delete_object is not None:
            delete_object(doc["storage_key"])
        else:
            print(f"[delete] VARNING: R2 delete inte tillgängligt, hoppar över fil-radering")
    except Exception as e:
        import traceback
        print(f"[delete] VARNING: Kunde inte radera fil i R2: {str(e)}")
        print(f"[delete] Traceback: {traceback.format_exc()}")
        # Fortsätt ändå med att radera metadata
    
    # Ta bort metadata i DB
    try:
        deleted = db.delete_document(document_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kunde inte radera dokument (hittades inte i databasen)"
            )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[delete] Error: {str(e)}")
        print(f"[delete] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte radera dokument: {str(e)}"
        )
    
    return {"ok": True}


# Billing endpoints
@app.post("/billing/checkout", response_model=CheckoutResponse)
async def checkout(request: CheckoutRequest):
    """
    Create Stripe Checkout session for subscription.
    """
    return await create_checkout_session(request)


@app.post("/billing/portal", response_model=PortalResponse)
async def portal(request: PortalRequest):
    """
    Create Stripe Customer Portal session.
    """
    return await create_portal_session(request)


@app.get("/billing/subscription", response_model=SubscriptionInfoResponse)
async def subscription(user_id: int = Depends(get_current_user_id)):
    """
    Get current subscription information.
    """
    return await get_subscription_info(user_id=user_id)


@app.post("/billing/webhook")
async def webhook(request: Request, stripe_signature: str = Header(..., alias="stripe-signature")):
    """
    Handle Stripe webhook events.
    This endpoint is called by Stripe when subscription events occur.
    """
    return await handle_stripe_webhook(request, stripe_signature)


# Credits endpoints
@app.get("/credits/balance", response_model=CreditsBalanceResponse)
async def credits_balance(user_id: int = Depends(get_current_user_id)):
    """
    Get current credits balance and allocation info.
    """
    return await get_credits_balance(user_id=user_id)


@app.get("/credits/history", response_model=CreditsHistoryResponse)
async def credits_history(
    user_id: int = Depends(get_current_user_id),
    limit: int = 50,
    offset: int = 0,
):
    """
    Get credit transaction history.
    """
    return await get_credits_history(user_id=user_id, limit=limit, offset=offset)


@app.post("/credits/checkout", response_model=CreditsCheckoutResponse)
async def credits_checkout(
    request: CreditsCheckoutRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Create Stripe Checkout session for credit purchase.
    """
    return await create_credits_checkout(request, user_id=user_id)


# Compliance analysis endpoint
class ComplianceAnalyzeRequest(BaseModel):
    document_name: str = Field(..., description="Namn på dokumentet att analysera")
    workspace: Optional[str] = Field(default="default", description="Workspace-ID")
    verbose: Optional[bool] = Field(default=False, description="Visa debug-output")


class ComplianceAnalyzeResponse(BaseModel):
    document: str
    scores: Dict[str, Any] = Field(..., description="Compliance-scores")
    gdpr: Dict[str, Any] = Field(..., description="GDPR-rapport")
    audit: Dict[str, Any] = Field(..., description="Audit-rapport")
    latency_ms: float


@app.post("/compliance/analyze", response_model=ComplianceAnalyzeResponse)
async def analyze_compliance(
    request: ComplianceAnalyzeRequest,
    http_request: Request,
    user_id: int = Depends(get_current_user_id),
):
    """
    Kör fullständig compliance-analys på ett dokument.
    
    Kör GDPR-scan, audit och beräknar compliance-score.
    
    Exempel:
    ```json
    {
      "document_name": "HR_Policy.pdf",
      "workspace": "default",
      "verbose": false
    }
    ```
    """
    # Check plan limits
    check_plan(user_id, "query")  # Använd query-limitering för nu
    
    # Ladda engine för rätt workspace
    workspace = request.workspace or "default"
    engine = _load_engine_for_workspace(workspace)
    
    if not engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAGEngine inte redo. Kör indexering först.",
        )
    
    # Hämta retriever från engine
    retriever = engine.retriever
    
    start = time.perf_counter()
    
    try:
        # Initiera agenter
        gdpr_agent = GDPRAgent(retriever=retriever)
        audit_agent = AuditAgent(retriever=retriever)
        score_engine = ComplianceScoreEngine()
        
        # Kör GDPR-scan
        gdpr_report = gdpr_agent.scan_document(
            document_name=request.document_name,
            workspace_id=workspace,
            verbose=request.verbose,
        )
        
        # Kör audit
        audit_report = audit_agent.audit_document(
            document_name=request.document_name,
            workspace_id=workspace,
            verbose=request.verbose,
        )
        
        # Beräkna compliance-score
        compliance_score = score_engine.calculate_compliance_score(
            gdpr_report=gdpr_report,
            audit_report=audit_report,
            document_name=request.document_name,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance analysis failed: {str(e)}",
        )
    
    end = time.perf_counter()
    latency_ms = (end - start) * 1000
    
    # Konvertera till JSON-format
    gdpr_dict = {
        "risk_score": gdpr_report.risk_score,
        "risk_level": gdpr_report.risk_level,
        "summary": gdpr_report.summary,
        "findings": [
            {
                "category": f.category,
                "severity": f.severity,
                "location": f.location,
                "description": f.description,
                "recommendation": f.recommendation,
            }
            for f in gdpr_report.findings
        ],
        "flags": {
            "has_personnummer": gdpr_report.has_personnummer,
            "has_health_data": gdpr_report.has_health_data,
            "has_sensitive_categories": gdpr_report.has_sensitive_categories,
            "missing_legal_basis": gdpr_report.missing_legal_basis,
            "missing_retention_period": gdpr_report.missing_retention_period,
            "missing_dpia": gdpr_report.missing_dpia,
        },
    }
    
    audit_dict = {
        "summary": audit_report.summary,
        "findings": [
            {
                "category": f.category,
                "priority": f.priority,
                "location": f.location,
                "problem": f.problem,
                "explanation": f.explanation,
                "suggestion": f.suggestion,
            }
            for f in audit_report.findings
        ],
        "counts": {
            "high_priority": audit_report.high_priority_count,
            "medium_priority": audit_report.medium_priority_count,
            "low_priority": audit_report.low_priority_count,
            "total": len(audit_report.findings),
        },
    }
    
    scores_dict = {
        "gdpr_risk": compliance_score.gdpr_risk_score,
        "audit_quality": compliance_score.audit_quality_score,
        "overall": compliance_score.overall_compliance_score,
        "completeness": compliance_score.completeness_score,
        "status": score_engine._get_status_level(compliance_score.overall_compliance_score),
        "recommendations_count": compliance_score.recommendations_count,
        "critical_issues_count": compliance_score.critical_issues_count,
    }
    
    # Deduct credits
    from api.plan_checker import deduct_credits
    from api.credits import calculate_query_cost
    cost = calculate_query_cost() * 3  # Compliance-analys kostar mer (3 queries)
    deduct_credits(user_id, cost, f"Compliance analysis: {request.document_name}")
    
    # Log usage
    usage_db = get_usage_db()
    usage_db.log_usage(user_id, "query")
    
    return ComplianceAnalyzeResponse(
        document=request.document_name,
        scores=scores_dict,
        gdpr=gdpr_dict,
        audit=audit_dict,
        latency_ms=latency_ms,
    )


# För lokal körning
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

