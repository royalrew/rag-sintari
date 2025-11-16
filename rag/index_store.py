"""Disk cache for vector index to avoid re-embedding."""
from __future__ import annotations

import os
import json
import pickle
import numpy as np
from typing import List, Dict, Any, Optional
from pathlib import Path


def get_workspace_dir(workspace: str, base_dir: str = "index_cache") -> Path:
    """Get cache directory for a workspace."""
    p = Path(base_dir) / workspace
    p.mkdir(parents=True, exist_ok=True)
    return p


def embeddings_path(workspace: str, base_dir: str = "index_cache") -> Path:
    return get_workspace_dir(workspace, base_dir) / "embeddings.npy"


def meta_path(workspace: str, base_dir: str = "index_cache") -> Path:
    return get_workspace_dir(workspace, base_dir) / "chunks_meta.json"


def bm25_path(workspace: str, base_dir: str = "index_cache") -> Path:
    return get_workspace_dir(workspace, base_dir) / "bm25.pkl"


def save_index(
    workspace: str,
    embeddings: np.ndarray,
    chunks_meta: List[Dict[str, Any]],
    bm25_obj: Any,
    base_dir: str = "index_cache",
) -> None:
    """Save index components to disk."""
    np.save(embeddings_path(workspace, base_dir), embeddings)
    
    with open(meta_path(workspace, base_dir), "w", encoding="utf-8") as f:
        json.dump(chunks_meta, f, indent=2, ensure_ascii=False)
    
    with open(bm25_path(workspace, base_dir), "wb") as f:
        pickle.dump(bm25_obj, f)
    
    print(f"[index_store] Saved index for workspace '{workspace}' ({len(chunks_meta)} chunks)")


def load_index(workspace: str, base_dir: str = "index_cache") -> Optional[Dict[str, Any]]:
    """Load cached index from disk."""
    epath = embeddings_path(workspace, base_dir)
    mpath = meta_path(workspace, base_dir)
    bpath = bm25_path(workspace, base_dir)
    
    if not (epath.exists() and mpath.exists() and bpath.exists()):
        return None
    
    embeddings = np.load(epath)
    
    with open(mpath, "r", encoding="utf-8") as f:
        chunks_meta = json.load(f)
    
    with open(bpath, "rb") as f:
        bm25_obj = pickle.load(f)
    
    print(f"[index_store] Loaded cached index for workspace '{workspace}' ({len(chunks_meta)} chunks)")
    
    return {
        "embeddings": embeddings,
        "chunks_meta": chunks_meta,
        "bm25": bm25_obj,
    }


def needs_rebuild(
    workspace: str,
    current_docs: List[Dict[str, Any]],
    base_dir: str = "index_cache"
) -> bool:
    """Check if cached index needs rebuild based on document mtimes.
    
    Args:
        workspace: workspace id
        current_docs: list of dicts with 'path' and 'mtime' keys
        base_dir: cache directory
    
    Returns:
        True if cache missing or docs changed
    """
    cache = load_index(workspace, base_dir)
    if cache is None:
        return True
    
    # Build dict of cached doc mtimes
    cached_docs = {}
    for chunk in cache["chunks_meta"]:
        doc_path = chunk.get("document_path")
        doc_mtime = chunk.get("document_mtime")
        if doc_path:
            cached_docs[doc_path] = doc_mtime
    
    # Check if any current doc is new or modified
    for doc in current_docs:
        doc_path = doc["path"]
        doc_mtime = doc["mtime"]
        if doc_path not in cached_docs:
            return True  # New document
        if cached_docs[doc_path] != doc_mtime:
            return True  # Modified document
    
    return False

