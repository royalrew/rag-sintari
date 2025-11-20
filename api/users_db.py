"""Database for user management."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict, Any


class UsersDB:
    """
    SQLite database for users.
    Table: users
    """
    
    def __init__(self, db_path: str = "./.rag_state/users.db"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()
    
    def _init_schema(self) -> None:
        """Create users table if it doesn't exist."""
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              hashed_password TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_email ON users(email);"
        )
        self.conn.commit()
    
    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
    ) -> Dict[str, Any]:
        """
        Create a new user.
        Returns the created user as a dict (without password).
        """
        created_at = datetime.now(timezone.utc).isoformat()
        
        cur = self.conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO users (email, name, hashed_password, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (email, name, hashed_password, created_at, created_at),
            )
            self.conn.commit()
            user_id = cur.lastrowid
            
            return {
                "id": user_id,
                "email": email,
                "name": name,
                "created_at": created_at,
            }
        except sqlite3.IntegrityError as e:
            # Email already exists
            self.conn.rollback()
            raise ValueError(f"User with email '{email}' already exists") from e
        except Exception as e:
            self.conn.rollback()
            raise RuntimeError(f"Failed to create user: {str(e)}") from e
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email, including hashed password."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, email, name, hashed_password, created_at, updated_at
            FROM users
            WHERE email = ?
            """,
            (email,),
        )
        row = cur.fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "email": row[1],
            "name": row[2],
            "hashed_password": row[3],
            "created_at": row[4],
            "updated_at": row[5],
        }
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID (without password)."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, email, name, created_at, updated_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "email": row[1],
            "name": row[2],
            "created_at": row[3],
            "updated_at": row[4],
        }
    
    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# Global instance
_users_db: Optional[UsersDB] = None


def get_users_db() -> UsersDB:
    """Get or create the global UsersDB instance."""
    global _users_db
    if _users_db is None:
        _users_db = UsersDB()
    return _users_db

