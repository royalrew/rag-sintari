"""RAG prestanda- och latensmätning."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import List, Dict, Any

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from rag.index_store import load_index
from rag.config_loader import load_config


def load_queries(path: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            raw = json.loads(line)
            # kräver minst "query"; workspace optional
            items.append(
                {
                    "id": raw.get("id"),
                    "query": raw["query"],
                    "workspace": raw.get("workspace", "default"),
                    "doc_ids": raw.get("doc_ids"),
                }
            )
    return items


def percentile(sorted_values: List[float], p: float) -> float:
    """
    Enkel percentil-beräkning: p ∈ [0, 100]
    sorted_values måste vara sorterad.
    """
    if not sorted_values:
        return 0.0
    if p <= 0:
        return sorted_values[0]
    if p >= 100:
        return sorted_values[-1]
    k = (len(sorted_values) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_values) - 1)
    if f == c:
        return sorted_values[f]
    d0 = sorted_values[f] * (c - k)
    d1 = sorted_values[c] * (k - f)
    return d0 + d1


def run_perf(
    engine: RAGEngine,
    queries: List[Dict[str, Any]],
    total_runs: int,
    warmup: int,
) -> Dict[str, float]:
    durations: List[float] = []
    
    # Warmup (ej mätt)
    print(f"[perf] Running {warmup} warmup queries...")
    for i in range(warmup):
        q = queries[i % len(queries)]
        engine.answer_question(
            question=q["query"],
            mode="answer",
            workspace_id=q["workspace"],
            document_ids=q["doc_ids"],
            verbose=False,
        )
    
    # Mätloop
    print(f"[perf] Running {total_runs} measured queries...")
    for i in range(total_runs):
        q = queries[i % len(queries)]
        start = time.perf_counter()
        engine.answer_question(
            question=q["query"],
            mode="answer",
            workspace_id=q["workspace"],
            document_ids=q["doc_ids"],
            verbose=False,
        )
        end = time.perf_counter()
        durations.append(end - start)
        
        # Progress indicator
        if (i + 1) % 50 == 0:
            print(f"[perf] Completed {i + 1}/{total_runs} queries...")
    
    durations.sort()
    
    avg = sum(durations) / len(durations)
    p50 = percentile(durations, 50)
    p95 = percentile(durations, 95)
    p99 = percentile(durations, 99)
    worst = durations[-1]
    best = durations[0]
    
    return {
        "count": len(durations),
        "avg": avg,
        "p50": p50,
        "p95": p95,
        "p99": p99,
        "max": worst,
        "min": best,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG prestanda- och latensmätning.")
    parser.add_argument(
        "--file",
        type=str,
        default="evaluation/data/rag_golden.jsonl",
        help="JSONL-fil med queries (minst fältet 'query').",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=100,
        help="Antal requests att köra (t.ex. 100, 200, 500).",
    )
    parser.add_argument(
        "--warmup",
        type=int,
        default=5,
        help="Antal warmup-requests innan mätning.",
    )
    parser.add_argument(
        "--workspace",
        type=str,
        default="default",
        help="Workspace att ladda index från",
    )
    args = parser.parse_args()
    
    path = Path(args.file)
    if not path.exists():
        print(f"[perf] Hittar inte query-fil: {path}")
        return 1
    
    queries = load_queries(path)
    if not queries:
        print("[perf] Inga queries hittades i filen.")
        return 1
    
    print(f"[perf] Läste {len(queries)} queries från {path}")
    print(f"[perf] Warmup: {args.warmup}, mät-runner: {args.runs}")
    
    # Bygg engine med cached index
    cfg = load_config()
    bench_cfg = cfg.get("bench", {}) or {}
    use_bench_prompt = bool(bench_cfg.get("use_bench_prompt", False))
    print(f"[perf] bench-mode: {'ON' if use_bench_prompt else 'OFF'}")
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    
    # Ladda index från cache
    cache = load_index(args.workspace, cache_dir)
    if not cache:
        print(f"[perf] Ingen cache hittades för workspace '{args.workspace}'")
        print(f"[perf] Kör först: python -m cli.chat_cli --docs_dir './my_docs' --workspace {args.workspace} --mode answer 'test'")
        return 1
    
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
    
    print(f"[perf] Laddat index med {len(items)} chunks från cache")
    
    stats = run_perf(
        engine=engine,
        queries=queries,
        total_runs=args.runs,
        warmup=args.warmup,
    )
    
    print("\n========== RAG PERFORMANCE ==========")
    print(f"Antal mätta requests: {stats['count']}")
    print(f"Min-latens:     {stats['min']*1000:.1f} ms")
    print(f"Medel-latens:   {stats['avg']*1000:.1f} ms")
    print(f"p50-latens:     {stats['p50']*1000:.1f} ms")
    print(f"p95-latens:     {stats['p95']*1000:.1f} ms")
    print(f"p99-latens:     {stats['p99']*1000:.1f} ms")
    print(f"Max-latens:     {stats['max']*1000:.1f} ms")
    print("=====================================\n")
    
    # Quality gate check
    p95_threshold_ms = 2000  # 2 sekunder
    avg_threshold_ms = 1000  # 1 sekund
    
    p95_ms = stats['p95'] * 1000
    avg_ms = stats['avg'] * 1000
    
    failed = False
    if p95_ms > p95_threshold_ms:
        print(f"[FAIL] p95 latency {p95_ms:.1f}ms överstiger tröskeln {p95_threshold_ms}ms")
        failed = True
    else:
        print(f"[PASS] p95 latency {p95_ms:.1f}ms inom tröskeln {p95_threshold_ms}ms")
    
    if avg_ms > avg_threshold_ms:
        print(f"[FAIL] Medel-latency {avg_ms:.1f}ms överstiger tröskeln {avg_threshold_ms}ms")
        failed = True
    else:
        print(f"[PASS] Medel-latency {avg_ms:.1f}ms inom tröskeln {avg_threshold_ms}ms")
    
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

