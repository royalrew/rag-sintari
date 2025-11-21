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
    from api.r2_client import upload_fileobj, generate_presigned_url, delete_object
    R2_DELETE_AVAILABLE = True
except ImportError:
    R2_DELETE_AVAILABLE = False
    delete_object = None

# Optional R2 client import
try:
    from api.r2_client import upload_fileobj
    R2_AVAILABLE = True
except ImportError:
    R2_AVAILABLE = False
    upload_fileobj = None


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
        
        # Uppskatta sidor baserat på filstorlek (rough estimate: ~50KB per sida)
        if size_bytes:
            estimated_pages = max(1, int(size_bytes / 50000))
    except Exception:
        # Om vi inte kan beräkna storlek, fortsätt ändå
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
        
        url = generate_presigned_url(doc["storage_key"])
        
        return DocumentDownloadResponse(
            ok=True,
            url=url,
            filename=doc["filename"]
        )
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


# Debug endpoint - lista alla användare (endast för debugging)
@app.get("/debug/users")
async def debug_list_users():
    """
    List all registered users (for debugging purposes only).
    WARNING: This endpoint should be removed or protected in production!
    """
    db = get_users_db()
    users = db.list_all_users()
    return {
        "count": len(users),
        "users": users
    }


# Admin endpoint - uppdatera användarens plan
class UpdatePlanRequest(BaseModel):
    email: str
    plan: str

@app.post("/debug/update-plan")
async def update_user_plan(request: UpdatePlanRequest):
    """
    Update a user's plan (for admin purposes).
    WARNING: This endpoint should be removed or protected in production!
    """
    db = get_users_db()
    
    user = db.get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{request.email}' not found"
        )
    
    # Validate plan
    from api.plans import get_plan_config
    plan_config = get_plan_config(request.plan)
    if plan_config is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {request.plan}. Valid plans: start, pro, enterprise, payg, credits"
        )
    
    # Update plan
    success = db.update_user_plan(user["id"], request.plan)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update plan"
        )
    
    # If enterprise plan, allocate large amount of credits
    if request.plan == "enterprise":
        from api.credits_db import get_credits_db
        credits_db = get_credits_db()
        credits_db.allocate_monthly_credits(user["id"], 100000)  # 100k credits
    
    return {
        "ok": True,
        "user_id": user["id"],
        "email": request.email,
        "old_plan": user.get("plan", "start"),
        "new_plan": request.plan,
        "message": f"User plan updated to {request.plan}"
    }


# Admin endpoint - skapa användare med enterprise plan
@app.post("/debug/create-admin")
async def create_admin_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
):
    """
    Create an admin user with enterprise plan (unlimited resources).
    WARNING: This endpoint should be removed or protected in production!
    """
    db = get_users_db()
    
    # Check if user already exists
    existing_user = db.get_user_by_email(email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{email}' already exists"
        )
    
    # Hash password and create user with enterprise plan
    hashed_password = get_password_hash(password)
    
    try:
        user_data = db.create_user(
            email=email,
            name=name,
            hashed_password=hashed_password,
            plan="enterprise",  # Enterprise plan = unlimited
        )
        
        # Allocate initial credits for enterprise (large amount)
        from api.credits_db import get_credits_db
        credits_db = get_credits_db()
        credits_db.allocate_monthly_credits(user_data["id"], 100000)  # 100k credits
        
        return {
            "ok": True,
            "user": user_data,
            "plan": "enterprise",
            "message": f"Admin user '{name}' created with enterprise plan (unlimited resources)"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# För lokal körning
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

