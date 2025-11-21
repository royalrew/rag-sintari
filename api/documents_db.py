"""Database for document metadata (R2 uploads)."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from api.db_config import db_path


class DocumentsDB:
    """
    SQLite database for document metadata.
    Table: documents_metadata
    """
    
    def __init__(self, db_path_param: Optional[str] = None):
        if db_path_param is None:
            db_path_param = db_path("documents.db")
        os.makedirs(os.path.dirname(db_path_param), exist_ok=True)
        self.conn = sqlite3.connect(db_path_param)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()
    
    def _init_schema(self) -> None:
        """Create documents_metadata table if it doesn't exist."""
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS documents_metadata (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              filename TEXT NOT NULL,
              storage_key TEXT NOT NULL UNIQUE,
              content_type TEXT,
              size_bytes INTEGER,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """
        )
        # Create indexes
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_id ON documents_metadata(user_id);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_storage_key ON documents_metadata(storage_key);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON documents_metadata(created_at DESC);"
        )
        self.conn.commit()
    
    def create_document(
        self,
        user_id: int,
        filename: str,
        storage_key: str,
        content_type: Optional[str] = None,
        size_bytes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a new document record.
        Returns the created document as a dict.
        """
        created_at = datetime.now(timezone.utc).isoformat()
        
        cur = self.conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO documents_metadata 
                (user_id, filename, storage_key, content_type, size_bytes, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, filename, storage_key, content_type, size_bytes, created_at),
            )
            self.conn.commit()
            doc_id = cur.lastrowid
            
            return {
                "id": doc_id,
                "user_id": user_id,
                "filename": filename,
                "storage_key": storage_key,
                "content_type": content_type,
                "size_bytes": size_bytes,
                "created_at": created_at,
            }
        except sqlite3.IntegrityError as e:
            # storage_key already exists
            self.conn.rollback()
            raise ValueError(f"Document with storage_key '{storage_key}' already exists") from e
        except Exception as e:
            self.conn.rollback()
            raise RuntimeError(f"Failed to create document: {str(e)}") from e
    
    def get_documents_by_user(
        self,
        user_id: int,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get all documents for a user, sorted by created_at DESC.
        """
        cur = self.conn.cursor()
        query = """
            SELECT id, user_id, filename, storage_key, content_type, size_bytes, created_at
            FROM documents_metadata
            WHERE user_id = ?
            ORDER BY created_at DESC
        """
        if limit:
            query += f" LIMIT {limit}"
        
        cur.execute(query, (user_id,))
        rows = cur.fetchall()
        
        return [
            {
                "id": row[0],
                "user_id": row[1],
                "filename": row[2],
                "storage_key": row[3],
                "content_type": row[4],
                "size_bytes": row[5],
                "created_at": row[6],
            }
            for row in rows
        ]
    
    def get_document_by_id(self, doc_id: int) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, user_id, filename, storage_key, content_type, size_bytes, created_at
            FROM documents_metadata
            WHERE id = ?
            """,
            (doc_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "user_id": row[1],
            "filename": row[2],
            "storage_key": row[3],
            "content_type": row[4],
            "size_bytes": row[5],
            "created_at": row[6],
        }
    
    def delete_document(self, doc_id: int) -> bool:
        """
        Delete a document by ID.
        Returns True if deleted, False if not found.
        """
        cur = self.conn.cursor()
        cur.execute(
            "DELETE FROM documents_metadata WHERE id = ?",
            (doc_id,),
        )
        self.conn.commit()
        return cur.rowcount > 0
    
    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# Global instance (will be initialized in startup)
_documents_db: Optional[DocumentsDB] = None


def get_documents_db() -> DocumentsDB:
    """Get or create the global DocumentsDB instance."""
    global _documents_db
    if _documents_db is None:
        _documents_db = DocumentsDB()
    return _documents_db

