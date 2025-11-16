"""Query logging för RAG-systemet - trådsäker JSONL-logging."""
from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


# Standardloggfil, kan override: RAG_QUERY_LOG_PATH=/path/to/log.jsonl
DEFAULT_LOG_PATH = Path("logs/rag_queries.jsonl")

# Global lock för trådsäker skrivning
_write_lock = threading.Lock()


@dataclass
class RetrievalSourceInfo:
    id: Optional[str] = None          # t.ex. filnamn eller dokument-ID
    score: Optional[float] = None     # BM25/embeddingsscore
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrievalStats:
    strategy: Optional[str] = None    # t.ex. "bm25", "embeddings", "hybrid"
    num_candidates: Optional[int] = None
    top_k: Optional[int] = None
    sources: List[RetrievalSourceInfo] = field(default_factory=list)


@dataclass
class QueryLogRecord:
    # Grundläggande metadata
    timestamp: str
    request_id: Optional[str]
    query: str
    mode: Optional[str] = None            # t.ex. "answer", "summary", "extract"
    model: Optional[str] = None           # t.ex. "gpt-4o"

    # Latens (ms)
    latency_ms: Optional[float] = None
    retrieval_latency_ms: Optional[float] = None
    llm_latency_ms: Optional[float] = None

    # Resultat
    success: bool = True
    error_type: Optional[str] = None
    error_message: Optional[str] = None

    # Retrieval-info
    retrieval: Optional[RetrievalStats] = None

    # Övrig metadata (kan fyllas på från engine/API)
    meta: Dict[str, Any] = field(default_factory=dict)


def _get_log_path() -> Path:
    """Returnera sökvägen till loggfilen (env override stöds)."""
    env_path = os.getenv("RAG_QUERY_LOG_PATH")
    if env_path:
        return Path(env_path)
    return DEFAULT_LOG_PATH


def _ensure_log_dir_exists(path: Path) -> None:
    """Skapa katalogen för loggfilen om den inte finns."""
    log_dir = path.parent
    log_dir.mkdir(parents=True, exist_ok=True)


def log_query(
    *,
    query: str,
    request_id: Optional[str] = None,
    mode: Optional[str] = None,
    model: Optional[str] = None,
    latency_ms: Optional[float] = None,
    retrieval_latency_ms: Optional[float] = None,
    llm_latency_ms: Optional[float] = None,
    success: bool = True,
    error: Optional[BaseException] = None,
    retrieval_stats: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Logga en RAG-förfrågan till JSONL.

    Tanken är att denna kallas från engine/API efter varje query,
    oavsett om det gick bra eller fel.

    Exempelanvändning i engine:

        start = time.perf_counter()
        try:
            answer, sources, stats = rag_engine.answer(...)
            total_ms = (time.perf_counter() - start) * 1000
            log_query(
                query=user_query,
                request_id=request_id,
                mode="answer",
                model="gpt-4o",
                latency_ms=total_ms,
                retrieval_latency_ms=stats.get("retrieval_ms"),
                llm_latency_ms=stats.get("llm_ms"),
                success=True,
                retrieval_stats=stats.get("retrieval"),
                meta={"source_count": len(sources)},
            )
        except Exception as exc:
            total_ms = (time.perf_counter() - start) * 1000
            log_query(
                query=user_query,
                request_id=request_id,
                mode="answer",
                model="gpt-4o",
                latency_ms=total_ms,
                success=False,
                error=exc,
                meta={"stage": "engine_answer"},
            )
            raise
    """
    timestamp = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"

    # Bygg RetrievalStats om data finns
    retrieval_obj: Optional[RetrievalStats] = None
    if retrieval_stats:
        sources_raw = retrieval_stats.get("sources") or []
        sources: List[RetrievalSourceInfo] = []
        for s in sources_raw:
            # Tillåt både dicts och redan färdiga dataclass-liknande objekt
            if isinstance(s, RetrievalSourceInfo):
                sources.append(s)
            elif isinstance(s, dict):
                sources.append(
                    RetrievalSourceInfo(
                        id=s.get("id") or s.get("chunk_id") or s.get("doc_id") or s.get("path"),
                        score=s.get("score") or s.get("hybrid_score"),
                        meta={k: v for k, v in s.items() if k not in ("id", "chunk_id", "doc_id", "path", "score", "hybrid_score")},
                    )
                )

        retrieval_obj = RetrievalStats(
            strategy=retrieval_stats.get("strategy"),
            num_candidates=retrieval_stats.get("num_candidates"),
            top_k=retrieval_stats.get("top_k"),
            sources=sources,
        )

    error_type = None
    error_message = None
    if error is not None:
        error_type = error.__class__.__name__
        # Håll meddelandet kort för loggen
        error_message = str(error)

    record = QueryLogRecord(
        timestamp=timestamp,
        request_id=request_id,
        query=query,
        mode=mode,
        model=model,
        latency_ms=latency_ms,
        retrieval_latency_ms=retrieval_latency_ms,
        llm_latency_ms=llm_latency_ms,
        success=success,
        error_type=error_type,
        error_message=error_message,
        retrieval=retrieval_obj,
        meta=meta or {},
    )

    log_path = _get_log_path()
    _ensure_log_dir_exists(log_path)

    # Trådsäker append till JSONL
    line = json.dumps(
        _to_primitive(record),
        ensure_ascii=False,
        separators=(",", ":"),
    )

    try:
        with _write_lock:
            with log_path.open("a", encoding="utf-8") as f:
                f.write(line + "\n")
    except Exception as log_exc:
        # Sista utväg: skriv till stderr och fortsätt – loggern får aldrig krascha RAG
        # (om du vill kan du byta till riktig logging här)
        print(f"[query_logger] Failed to write log: {log_exc}", flush=True)


def _to_primitive(record: QueryLogRecord) -> Dict[str, Any]:
    """
    Konvertera dataclasses till dicts som går att json-dumpar.
    """
    def convert(obj: Any) -> Any:
        if isinstance(obj, QueryLogRecord) or isinstance(obj, RetrievalStats) or isinstance(obj, RetrievalSourceInfo):
            return {k: convert(v) for k, v in asdict(obj).items() if v is not None}
        if isinstance(obj, list):
            return [convert(x) for x in obj]
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        return obj

    return convert(record)

