from __future__ import annotations

from typing import List, Dict, Any, Optional

from rag.config_loader import load_config
from rag.embeddings_client import EmbeddingsClient
from rag.index import VectorIndex, IndexHit, IndexItem
import numpy as np
from rank_bm25 import BM25Okapi


class Retriever:
    def __init__(self, index: VectorIndex, embeddings_client: Optional[EmbeddingsClient] = None) -> None:
        cfg = load_config()
        retrieval_cfg = cfg.get("retrieval", {})
        self.top_k: int = int(retrieval_cfg.get("top_k", 8))
        self.mode: str = (retrieval_cfg.get("mode") or "hybrid").lower()
        hybrid_cfg = retrieval_cfg.get("hybrid", {}) or {}
        self.alpha: float = float(hybrid_cfg.get("alpha", 0.35))  # BM25 weight
        self.beta: float = float(hybrid_cfg.get("beta", 0.65))    # Embeddings weight
        self.index = index
        self._emb = embeddings_client or EmbeddingsClient()

    def retrieve(self, question: str, workspace_id: Optional[str] = None, document_ids: Optional[List[str]] = None, verbose: bool = False) -> List[Dict[str, Any]]:
        # Prepare candidate items with filtering
        def allowed(item: IndexItem) -> bool:
            md = item.metadata or {}
            if workspace_id and md.get("workspace_id") != workspace_id:
                return False
            if document_ids:
                did = md.get("document_name") or md.get("document_id")
                if did not in set(document_ids):
                    return False
            return True

        candidates: List[IndexItem] = [it for it in self.index.iter_items() if allowed(it)]
        if not candidates:
            return []

        # Embed question once
        q_emb = np.array(self._emb.embed_texts([question])[0], dtype=float)
        # Normalize embedding if needed (match index normalization)
        q_norm = np.linalg.norm(q_emb) or 1.0
        q_emb = q_emb / q_norm

        texts = [it.metadata.get("text", "") for it in candidates]

        # BM25 scoring
        tokens = [t.lower().split() for t in texts]
        bm25 = BM25Okapi(tokens) if tokens else None
        bm25_scores = bm25.get_scores(question.lower().split()).tolist() if bm25 else [0.0] * len(candidates)

        # Embedding cosine scoring (dot product as we normalized)
        emb_scores: List[float] = []
        for it in candidates:
            vec = it.embedding
            if vec is None or len(vec) == 0:
                emb_scores.append(0.0)
            else:
                emb_scores.append(float(np.dot(q_emb, vec)))

        # Normalize scores to [0,1]
        def norm(scores: List[float]) -> List[float]:
            if not scores:
                return []
            s_min = float(min(scores))
            s_max = float(max(scores))
            # If there is only one candidate or all equal:
            if s_max - s_min < 1e-9:
                # If all zero, keep zeros; otherwise treat as perfect match
                return [0.0 if s_max == 0.0 else 1.0 for _ in scores]
            return [(s - s_min) / (s_max - s_min) for s in scores]

        bm25_norm = norm(bm25_scores)
        emb_norm = norm(emb_scores)

        # Combine per mode
        combined: List[float] = []
        method = "embeddings"
        if self.mode == "bm25":
            combined = bm25_norm
            method = "bm25"
        elif self.mode == "hybrid":
            combined = [self.alpha * b + self.beta * e for b, e in zip(bm25_norm, emb_norm)]
            method = "hybrid"
        else:
            combined = emb_norm
            method = "embeddings"

        # Optional debug per candidate
        if verbose:
            import sys
            for idx, item in enumerate(candidates):
                chunk_id = item.id
                chunk_text = (item.metadata or {}).get("text", "")
                bm25_score = bm25_norm[idx] if idx < len(bm25_norm) else 0.0
                emb_score = emb_norm[idx] if idx < len(emb_norm) else 0.0
                combined_score = combined[idx] if idx < len(combined) else 0.0
                preview = (chunk_text[:80].replace("\n", " ")) + ("..." if len(chunk_text) > 80 else "")
                print(
                    f"[retriever] {chunk_id} | bm25={bm25_score:.3f} | emb={emb_score:.3f} | hybrid={combined_score:.3f} | preview='{preview}'",
                    file=sys.stderr,
                )

        # Rank and build results
        ranked = sorted(zip(candidates, combined), key=lambda x: x[1], reverse=True)[: self.top_k]
        results: List[Dict[str, Any]] = []
        for item, score in ranked:
            md = dict(item.metadata or {})
            md["method"] = method
            results.append(
                {
                    "text": md.get("text", ""),
                    "score": float(score),
                    "metadata": md,
                }
            )
        return results


