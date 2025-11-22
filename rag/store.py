from __future__ import annotations

import os
import sqlite3
from typing import Iterable, List, Dict, Any, Optional, Tuple


class Store:
    """
    Minimal SQLite store for documents and chunks.
    Tables:
      documents(id TEXT PRIMARY KEY, name TEXT, version INTEGER, workspace_id TEXT)
      chunks(id TEXT PRIMARY KEY, document_id TEXT, text TEXT, page_number INTEGER, embedded_at TEXT, FOREIGN KEY(document_id) REFERENCES documents(id))
    """

    def __init__(self, db_path: str = "./.rag_state/rag.sqlite") -> None:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()

    def _init_schema(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              name TEXT,
              version INTEGER,
              workspace_id TEXT,
              mtime TEXT
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
              id TEXT PRIMARY KEY,
              document_id TEXT,
              text TEXT,
              page_number INTEGER,
              embedded_at TEXT,
              embedding BLOB,
              FOREIGN KEY(document_id) REFERENCES documents(id)
            );
            """
        )
        # Migrate existing tables: add mtime and embedding if missing
        try:
            cur.execute("SELECT mtime FROM documents LIMIT 1")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE documents ADD COLUMN mtime TEXT")
        try:
            cur.execute("SELECT embedding FROM chunks LIMIT 1")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE chunks ADD COLUMN embedding BLOB")
        self.conn.commit()

    def upsert_document(self, doc_id: str, name: str, version: int, workspace_id: str, mtime: Optional[str] = None) -> None:
        self.conn.execute(
            """
            INSERT INTO documents(id, name, version, workspace_id, mtime)
            VALUES(?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, version=excluded.version, workspace_id=excluded.workspace_id, mtime=excluded.mtime
            """,
            (doc_id, name, version, workspace_id, mtime),
        )
        self.conn.commit()

    def upsert_chunks(self, rows: Iterable[Tuple[str, str, str, int, Optional[str]]]) -> None:
        """
        rows: (chunk_id, document_id, text, page_number, embedded_at)
        """
        self.conn.executemany(
            """
            INSERT INTO chunks(id, document_id, text, page_number, embedded_at)
            VALUES(?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET document_id=excluded.document_id, text=excluded.text, page_number=excluded.page_number, embedded_at=excluded.embedded_at
            """,
            list(rows),
        )
        self.conn.commit()

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, name, version, workspace_id FROM documents WHERE id=?", (doc_id,))
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "version": row[2], "workspace_id": row[3]}

    def list_chunks_for_document(self, doc_id: str) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, text, page_number, embedded_at FROM chunks WHERE document_id=?", (doc_id,))
        rows = cur.fetchall()
        return [{"id": r[0], "text": r[1], "page_number": r[2], "embedded_at": r[3]} for r in rows]

    
    def get_chunks_by_workspace(self, workspace: str) -> List[Dict[str, Any]]:
        """Get all chunks for a workspace with document metadata."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT 
                c.id as chunk_id,
                c.document_id,
                c.text,
                c.page_number,
                c.embedded_at,
                d.name as document_name,
                d.workspace_id,
                d.mtime
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE d.workspace_id = ?
            """,
            (workspace,),
        )
        rows = cur.fetchall()
        return [
            {
                "chunk_id": r[0],
                "document_id": r[1],
                "text": r[2],
                "page_number": r[3],
                "embedded_at": r[4],
                "document_name": r[5],
                "workspace": r[6],
                "mtime": r[7],
            }
            for r in rows
        ]

    def count_documents(self, workspace_id: Optional[str] = None) -> int:
        """Räkna antal dokument, filtrera på workspace om angivet."""
        cur = self.conn.cursor()
        if workspace_id:
            cur.execute("SELECT COUNT(*) FROM documents WHERE workspace_id=?", (workspace_id,))
        else:
            cur.execute("SELECT COUNT(*) FROM documents")
        return cur.fetchone()[0]
    
    def count_workspaces(self) -> int:
        """Räkna antal unika workspaces."""
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(DISTINCT workspace_id) FROM documents")
        return cur.fetchone()[0]
    
    def list_workspaces(self) -> List[str]:
        """Lista alla unika workspace-ids."""
        cur = self.conn.cursor()
        cur.execute("SELECT DISTINCT workspace_id FROM documents")
        return [row[0] for row in cur.fetchall() if row[0]]
    
    def list_workspaces_with_stats(self) -> List[Dict[str, Any]]:
        """Lista alla workspaces med statistik (antal dokument och chunks)."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT 
                d.workspace_id,
                COUNT(DISTINCT d.id) as doc_count,
                COUNT(c.id) as chunk_count
            FROM documents d
            LEFT JOIN chunks c ON c.document_id = d.id
            GROUP BY d.workspace_id
            ORDER BY d.workspace_id
            """
        )
        rows = cur.fetchall()
        return [
            {"workspace_id": r[0], "doc_count": r[1], "chunk_count": r[2]}
            for r in rows
        ]
    
    def list_documents_in_workspace(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Lista alla dokument i en workspace med chunk-count."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT 
                d.id,
                d.name,
                d.version,
                COUNT(c.id) as chunk_count
            FROM documents d
            LEFT JOIN chunks c ON c.document_id = d.id
            WHERE d.workspace_id = ?
            GROUP BY d.id, d.name, d.version
            ORDER BY d.name
            """,
            (workspace_id,)
        )
        rows = cur.fetchall()
        return [
            {"id": r[0], "name": r[1], "version": r[2], "chunk_count": r[3]}
            for r in rows
        ]
    
    def delete_document_by_id(self, doc_id: str) -> bool:
        """
        Ta bort ett dokument och alla dess chunks från Store.
        Returns True om dokumentet hittades och raderades, False annars.
        """
        cur = self.conn.cursor()
        
        # Ta bort chunks först (foreign key constraint)
        cur.execute("DELETE FROM chunks WHERE document_id=?", (doc_id,))
        chunks_deleted = cur.rowcount
        
        # Ta bort dokument
        cur.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        doc_deleted = cur.rowcount > 0
        
        self.conn.commit()
        
        if doc_deleted:
            print(f"[Store] Deleted document {doc_id} and {chunks_deleted} chunks")
        
        return doc_deleted


