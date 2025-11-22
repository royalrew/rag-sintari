"""Disk cache for vector index to avoid re-embedding."""
from __future__ import annotations

import os
import json
import pickle
import time
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
    
    # Lägg till timestamp i metadata
    timestamp = time.time()
    
    meta_with_timestamp = {
        "chunks_meta": chunks_meta,
        "indexed_at": timestamp,
        "indexed_at_iso": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
    }
    
    with open(meta_path(workspace, base_dir), "w", encoding="utf-8") as f:
        json.dump(meta_with_timestamp, f, indent=2, ensure_ascii=False)
    
    with open(bm25_path(workspace, base_dir), "wb") as f:
        pickle.dump(bm25_obj, f)
    
    print(f"[index_store] Saved index for workspace '{workspace}' ({len(chunks_meta)} chunks) at {meta_with_timestamp['indexed_at_iso']}")


def load_index(workspace: str, base_dir: str = "index_cache") -> Optional[Dict[str, Any]]:
    """Load cached index from disk."""
    epath = embeddings_path(workspace, base_dir)
    mpath = meta_path(workspace, base_dir)
    bpath = bm25_path(workspace, base_dir)
    
    if not (epath.exists() and mpath.exists() and bpath.exists()):
        return None
    
    embeddings = np.load(epath)
    
    with open(mpath, "r", encoding="utf-8") as f:
        meta_data = json.load(f)
    
    # Support både gammalt format (lista) och nytt format (dict med timestamp)
    if isinstance(meta_data, list):
        chunks_meta = meta_data
        indexed_at = None
        indexed_at_iso = None
        index_source = "cached (legacy)"  # Gammal cache utan timestamp
    else:
        chunks_meta = meta_data.get("chunks_meta", [])
        indexed_at = meta_data.get("indexed_at")
        indexed_at_iso = meta_data.get("indexed_at_iso")
        index_source = "cached"
    
    with open(bpath, "rb") as f:
        bm25_obj = pickle.load(f)
    
    print(f"[index_store] Loaded {index_source} index for workspace '{workspace}' ({len(chunks_meta)} chunks)" + (f" indexed at {indexed_at_iso}" if indexed_at_iso else ""))
    
    result = {
        "embeddings": embeddings,
        "chunks_meta": chunks_meta,
        "bm25": bm25_obj,
    }
    
    # Lägg till metadata om timestamp finns
    if indexed_at is not None:
        result["indexed_at"] = indexed_at
        result["indexed_at_iso"] = indexed_at_iso
        result["index_source"] = index_source
    
    return result


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

