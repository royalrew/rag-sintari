"""Database path configuration for persistent storage."""
import os
import sys

# Default för lokal utveckling
DEFAULT_DIR = "./.rag_state"

# Railway mountar volymen på /data
RAG_STATE_DIR = os.getenv("RAG_STATE_DIR", DEFAULT_DIR)

# Se till att katalogen finns
os.makedirs(RAG_STATE_DIR, exist_ok=True)

# Debug: logga var databaser sparas
print(f"[db_config] RAG_STATE_DIR: {RAG_STATE_DIR}", file=sys.stderr, flush=True)
print(f"[db_config] RAG_STATE_DIR env var: {os.getenv('RAG_STATE_DIR', 'NOT SET')}", file=sys.stderr, flush=True)
print(f"[db_config] Absolute path: {os.path.abspath(RAG_STATE_DIR)}", file=sys.stderr, flush=True)


def db_path(filename: str) -> str:
    """
    Returnerar en absolut sökväg till en databasfil.
    Exempel: db_path("users.db") → "/data/users.db" på Railway.
    """
    full_path = os.path.join(RAG_STATE_DIR, filename)
    abs_path = os.path.abspath(full_path)
    print(f"[db_config] db_path('{filename}') → {abs_path}", file=sys.stderr, flush=True)
    return full_path

