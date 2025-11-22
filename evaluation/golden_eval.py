"""Världsklass RAG golden evaluation med tier-system."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from rag.engine import RAGEngine
from rag.retriever import Retriever
from rag.embeddings_client import EmbeddingsClient
from rag.index import InMemoryIndex, IndexItem
from rag.config_loader import load_config
from rag.index_store import load_index
from evaluation.style_critic import get_formatting_bonus
import numpy as np


# --------- Datamodeller --------- #

@dataclass
class GoldenCase:
    id: str
    query: str
    workspace: str = "default"
    doc_ids: Optional[List[str]] = None
    expected_sources: Optional[List[str]] = None
    must_have_keywords: Optional[List[str]] = None
    nice_to_have_keywords: Optional[List[str]] = None
    forbidden_keywords: Optional[List[str]] = None
    difficulty: str = "unknown"
    tags: Optional[List[str]] = None


@dataclass
class CaseResult:
    id: str
    query: str
    workspace: str
    doc_ids: List[str]
    expected_sources: List[str]
    
    source_hit: bool
    source_recall: float
    source_precision: float
    
    must_coverage: float
    nice_coverage: float
    forbidden_hits: int
    
    returned_docs: List[str]
    difficulty: str
    tags: List[str]
    tier: str  # Bronze/Silver/Gold/Platinum/Diamond


# --------- Utils --------- #

def normalize(s: str) -> str:
    return (s or "").lower()


def load_golden(path: Path) -> List[GoldenCase]:
    cases: List[GoldenCase] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            raw = json.loads(line)
            cases.append(
                GoldenCase(
                    id=raw["id"],
                    query=raw["query"],
                    workspace=raw.get("workspace", "default"),
                    doc_ids=raw.get("doc_ids"),
                    expected_sources=raw.get("expected_sources"),
                    must_have_keywords=raw.get("must_have_keywords"),
                    nice_to_have_keywords=raw.get("nice_to_have_keywords"),
                    forbidden_keywords=raw.get("forbidden_keywords"),
                    difficulty=raw.get("difficulty", "unknown"),
                    tags=raw.get("tags"),
                )
            )
    return cases


# --------- Tiering-logik --------- #

def compute_tier(
    source_hit: bool,
    source_recall: float,
    must_coverage: float,
    nice_coverage: float,
    forbidden_hits: int,
) -> str:
    """
    Enkel men hård tiering:
    - Diamond:  source_hit, recall>=0.9, must>=0.95, nice>=0.7, forbidden=0
    - Platinum: source_hit, recall>=0.8, must>=0.9,  nice>=0.5, forbidden=0
    - Gold:     source_hit, recall>=0.7, must>=0.85, nice>=0.3, forbidden=0
    - Silver:   source_hit, must>=0.7,   forbidden=0
    - Bronze:   allt annat
    """
    if forbidden_hits > 0:
        return "Bronze"
    
    if source_hit and source_recall >= 0.9 and must_coverage >= 0.95 and nice_coverage >= 0.7:
        return "Diamond"
    
    if source_hit and source_recall >= 0.8 and must_coverage >= 0.9 and nice_coverage >= 0.5:
        return "Platinum"
    
    if source_hit and source_recall >= 0.7 and must_coverage >= 0.85 and nice_coverage >= 0.3:
        return "Gold"
    
    if source_hit and must_coverage >= 0.7:
        return "Silver"
    
    return "Bronze"


# --------- Eval av ett case --------- #

def eval_single_case(engine: RAGEngine, case: GoldenCase) -> CaseResult:
    result = engine.answer_question(
        question=case.query,
        mode="answer",
        workspace_id=case.workspace,
        document_ids=case.doc_ids,
        verbose=False,
    )
    
    answer: str = result.get("answer") or ""
    sources = result.get("sources") or []
    
    answer_norm = normalize(answer)
    expected_sources = case.expected_sources or []
    
    # Dokumentnamn som modellen faktiskt använde
    returned_docs = sorted({s.get("document_name") for s in sources if s.get("document_name")})
    
    # --- Source metrics ---
    if expected_sources:
        exp_set = set(expected_sources)
        ret_set = set(returned_docs)
        
        intersect = exp_set & ret_set
        source_hit = len(intersect) > 0
        source_recall = len(intersect) / len(exp_set)
        source_precision = len(intersect) / len(ret_set) if ret_set else 0.0
    else:
        # Om inget specificerat → vi räknar allt som OK
        source_hit = True
        source_recall = 1.0
        source_precision = 1.0
    
    # --- Keyword metrics ---
    must = [normalize(k) for k in (case.must_have_keywords or [])]
    nice = [normalize(k) for k in (case.nice_to_have_keywords or [])]
    forbidden = [normalize(k) for k in (case.forbidden_keywords or [])]
    
    must_total = len(must)
    nice_total = len(nice)
    
    must_hits = sum(1 for k in must if k and k in answer_norm)
    nice_hits = sum(1 for k in nice if k and k in answer_norm)
    forbidden_hits = sum(1 for k in forbidden if k and k in answer_norm)
    
    must_coverage = (must_hits / must_total) if must_total > 0 else 1.0
    nice_coverage = (nice_hits / nice_total) if nice_total > 0 else 0.0
    
    # Add formatting bonus to nice_coverage (+0.1 to +0.2)
    formatting_bonus = get_formatting_bonus(answer)
    nice_coverage = min(1.0, nice_coverage + formatting_bonus)
    
    tier = compute_tier(
        source_hit=source_hit,
        source_recall=source_recall,
        must_coverage=must_coverage,
        nice_coverage=nice_coverage,
        forbidden_hits=forbidden_hits,
    )
    
    return CaseResult(
        id=case.id,
        query=case.query,
        workspace=case.workspace,
        doc_ids=case.doc_ids or [],
        expected_sources=expected_sources,
        source_hit=source_hit,
        source_recall=source_recall,
        source_precision=source_precision,
        must_coverage=must_coverage,
        nice_coverage=nice_coverage,
        forbidden_hits=forbidden_hits,
        returned_docs=returned_docs,
        difficulty=case.difficulty,
        tags=case.tags or [],
        tier=tier,
    )


# --------- Aggregation & utskrift --------- #

def print_summary(results: List[CaseResult]) -> None:
    n = len(results)
    if n == 0:
        print("[eval] Inga golden cases hittades.")
        return
    
    source_hit_rate = sum(1 for r in results if r.source_hit) / n
    avg_recall = sum(r.source_recall for r in results) / n
    avg_must = sum(r.must_coverage for r in results) / n
    avg_nice = sum(r.nice_coverage for r in results) / n
    total_forbidden = sum(r.forbidden_hits for r in results)
    
    tier_counts: Dict[str, int] = {}
    for r in results:
        tier_counts[r.tier] = tier_counts.get(r.tier, 0) + 1
    
    print("\n========== RAG GOLDEN EVAL ==========")
    print(f"Antal testfall: {n}")
    print(f"Source-hit rate:          {source_hit_rate:.3f}")
    print(f"Genomsnittlig recall:     {avg_recall:.3f}")
    print(f"Genomsnittlig must-cover: {avg_must:.3f}")
    print(f"Genomsnittlig nice-cover: {avg_nice:.3f}")
    print(f"Totala forbidden-hits:    {total_forbidden}")
    print("Tier-fördelning:")
    for tier in ["Diamond", "Platinum", "Gold", "Silver", "Bronze"]:
        c = tier_counts.get(tier, 0)
        print(f"  {tier:<9}: {c}/{n}")
    print("=====================================\n")
    
    print("Detaljer per case:")
    for r in results:
        print(
            f"- {r.id} [{r.difficulty}] "
            f"=> tier={r.tier} | "
            f"sources={r.returned_docs} vs exp={r.expected_sources} | "
            f"must={r.must_coverage:.2f} | "
            f"nice={r.nice_coverage:.2f} | "
            f"forbidden_hits={r.forbidden_hits}"
        )


# --------- Main --------- #

def main() -> int:
    parser = argparse.ArgumentParser(description="Världsklass RAG golden eval.")
    parser.add_argument(
        "--file",
        type=str,
        default="evaluation/data/rag_golden.jsonl",
        help="Sökväg till JSONL med golden cases.",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="evaluation/output/rag_eval_results.jsonl",
        help="Sökväg att skriva detaljerade resultat till (JSONL).",
    )
    parser.add_argument(
        "--workspace",
        type=str,
        default="default",
        help="Workspace att ladda index från",
    )
    args = parser.parse_args()
    
    in_path = Path(args.file)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    if not in_path.exists():
        print(f"[eval] Hittar inte golden-fil: {in_path}")
        return 1
    
    cases = load_golden(in_path)
    print(f"[eval] Läser {len(cases)} golden cases från {in_path}")
    
    # Bygg engine med cached index
    cfg = load_config()
    storage_cfg = cfg.get("storage", {})
    cache_dir = storage_cfg.get("index_dir", "index_cache")
    
    # Ladda index från cache
    cache = load_index(args.workspace, cache_dir)
    if not cache:
        print(f"[eval] Ingen cache hittades för workspace '{args.workspace}'")
        print(f"[eval] Kör först: python -m cli.chat_cli --docs_dir './my_docs' --workspace {args.workspace} --mode answer 'test'")
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
    
    print(f"[eval] Laddat index med {len(items)} chunks från cache")
    
    results: List[CaseResult] = []
    with out_path.open("w", encoding="utf-8") as outf:
        for case in cases:
            print(f"[eval] Kör case: {case.id}")
            res = eval_single_case(engine, case)
            results.append(res)
            outf.write(json.dumps(asdict(res), ensure_ascii=False) + "\n")
    
    print_summary(results)
    print(f"[eval] Skrev detaljerad rapport till: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

