from __future__ import annotations

from typing import Any, Dict

from rag.index import InMemoryIndex, VectorIndex
from rag.config_loader import load_config


def build_index(cfg: Dict[str, Any] | None = None) -> VectorIndex:
    cfg = cfg or load_config()
    index_cfg = cfg.get("index", {}) or {}
    backend = (index_cfg.get("type") or "inmemory").lower()

    if backend in ("inmemory", "chroma", "faiss", "pgvector"):
        # For MVP we return InMemoryIndex for all; later swap real backends
        return InMemoryIndex()

    # Default fallback
    return InMemoryIndex()


