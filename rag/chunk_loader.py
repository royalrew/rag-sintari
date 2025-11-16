"""Load chunks from SQLite store for index building."""
from __future__ import annotations
import os
from typing import List, Dict, Any
from rag.store import DocumentStore


def load_chunks_from_db(workspace: str) -> List[Dict[str, Any]]:
    """Load all chunks for a workspace from SQLite.
    
    Returns list of dicts with keys:
    - chunk_id
    - document_id
    - workspace
    - text
    - embedding (as list)
    - mtime (document modification time)
    """
    # TODO: Använd rätt DB-path från config
    db_path = os.getenv("RAG_DB_PATH", "rag_store.db")
    store = DocumentStore(db_path)
    
    # Hämta alla chunks för workspace
    chunks = store.get_chunks_by_workspace(workspace)
    
    return chunks

