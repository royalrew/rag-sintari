"""Database path configuration for persistent storage."""
import os

# Default för lokal utveckling
DEFAULT_DIR = "./.rag_state"

# Railway mountar volymen på /data
RAG_STATE_DIR = os.getenv("RAG_STATE_DIR", DEFAULT_DIR)

# Se till att katalogen finns
os.makedirs(RAG_STATE_DIR, exist_ok=True)


def db_path(filename: str) -> str:
    """
    Returnerar en absolut sökväg till en databasfil.
    Exempel: db_path("users.sqlite") → "/data/users.sqlite" på Railway.
    """
    return os.path.join(RAG_STATE_DIR, filename)

