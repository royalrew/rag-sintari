"""Database for usage tracking."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from api.db_config import db_path


class UsageDB:
    """
    SQLite database for usage tracking.
    Table: usage_log
    """
    
    def __init__(self, db_path_param: Optional[str] = None):
        if db_path_param is None:
            db_path_param = db_path("usage.db")
        os.makedirs(os.path.dirname(db_path_param), exist_ok=True)
        self.conn = sqlite3.connect(db_path_param)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()
    
    def _init_schema(self) -> None:
        """Create usage_log table if it doesn't exist."""
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS usage_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              type TEXT NOT NULL,
              timestamp TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """
        )
        # Create indexes for fast queries
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_type_timestamp ON usage_log(user_id, type, timestamp);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_user_timestamp ON usage_log(user_id, timestamp);"
        )
        self.conn.commit()
    
    def log_usage(
        self,
        user_id: int,
        usage_type: str,  # "query" | "upload" | "workspace_create"
    ) -> None:
        """Log a usage event."""
        timestamp = datetime.now(timezone.utc).isoformat()
        cur = self.conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO usage_log (user_id, type, timestamp)
                VALUES (?, ?, ?)
                """,
                (user_id, usage_type, timestamp),
            )
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(f"[usage_db] Error logging usage: {e}")
    
    def count_usage_this_month(
        self,
        user_id: int,
        usage_type: str,
    ) -> int:
        """
        Count usage events for current month.
        Returns count of events of given type for user in current month.
        """
        cur = self.conn.cursor()
        # Get first day of current month
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        cur.execute(
            """
            SELECT COUNT(*) FROM usage_log
            WHERE user_id = ? AND type = ? AND timestamp >= ?
            """,
            (user_id, usage_type, month_start),
        )
        result = cur.fetchone()
        return result[0] if result else 0
    
    def count_usage_all_time(
        self,
        user_id: int,
        usage_type: str,
    ) -> int:
        """Count all-time usage for a user and type."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT COUNT(*) FROM usage_log
            WHERE user_id = ? AND type = ?
            """,
            (user_id, usage_type),
        )
        result = cur.fetchone()
        return result[0] if result else 0
    
    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# Global instance
_usage_db: Optional[UsageDB] = None


def get_usage_db() -> UsageDB:
    """Get or create the global UsageDB instance."""
    global _usage_db
    if _usage_db is None:
        _usage_db = UsageDB()
    return _usage_db

