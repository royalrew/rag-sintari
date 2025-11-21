"""Database for user management."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from api.db_config import db_path


class UsersDB:
    """
    SQLite database for users.
    Table: users
    """
    
    def __init__(self, db_path_param: Optional[str] = None):
        if db_path_param is None:
            db_path_param = db_path("users.db")
        os.makedirs(os.path.dirname(db_path_param), exist_ok=True)
        self.conn = sqlite3.connect(db_path_param)
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
              plan TEXT NOT NULL DEFAULT 'start',
              stripe_customer_id TEXT,
              stripe_subscription_id TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """
        )
        # Migrate existing tables: add columns if missing
        try:
            cur.execute("SELECT plan FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'start'")
        
        try:
            cur.execute("SELECT stripe_customer_id FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT")
        
        try:
            cur.execute("SELECT stripe_subscription_id FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT")
        
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_email ON users(email);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_plan ON users(plan);"
        )
        self.conn.commit()
    
    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        plan: str = "start",
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
                INSERT INTO users (email, name, hashed_password, plan, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (email, name, hashed_password, plan, created_at, created_at),
            )
            self.conn.commit()
            user_id = cur.lastrowid
            
            return {
                "id": user_id,
                "email": email,
                "name": name,
                "plan": plan,
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
            SELECT id, email, name, hashed_password, plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at
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
            "plan": row[4] if len(row) > 4 else "start",
            "stripe_customer_id": row[5] if len(row) > 5 else None,
            "stripe_subscription_id": row[6] if len(row) > 6 else None,
            "created_at": row[7] if len(row) > 7 else row[4],
            "updated_at": row[8] if len(row) > 8 else row[5],
        }
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID (without password)."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, email, name, plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at
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
            "plan": row[3] if len(row) > 3 else "start",
            "stripe_customer_id": row[4] if len(row) > 4 else None,
            "stripe_subscription_id": row[5] if len(row) > 5 else None,
            "created_at": row[6] if len(row) > 6 else row[3],
            "updated_at": row[7] if len(row) > 7 else row[4],
        }
    
    def update_user_plan(self, user_id: int, plan: str) -> bool:
        """Update user's plan."""
        cur = self.conn.cursor()
        updated_at = datetime.now(timezone.utc).isoformat()
        try:
            cur.execute(
                """
                UPDATE users
                SET plan = ?, updated_at = ?
                WHERE id = ?
                """,
                (plan, updated_at, user_id),
            )
            self.conn.commit()
            return cur.rowcount > 0
        except Exception:
            self.conn.rollback()
            return False
    
    def update_stripe_info(
        self,
        user_id: int,
        customer_id: Optional[str] = None,
        subscription_id: Optional[str] = None,
    ) -> bool:
        """Update Stripe customer and subscription IDs."""
        cur = self.conn.cursor()
        updated_at = datetime.now(timezone.utc).isoformat()
        try:
            updates = []
            params = []
            
            if customer_id is not None:
                updates.append("stripe_customer_id = ?")
                params.append(customer_id)
            
            if subscription_id is not None:
                updates.append("stripe_subscription_id = ?")
                params.append(subscription_id)
            
            if not updates:
                return True
            
            updates.append("updated_at = ?")
            params.append(updated_at)
            params.append(user_id)
            
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            cur.execute(query, params)
            self.conn.commit()
            return cur.rowcount > 0
        except Exception:
            self.conn.rollback()
            return False
    
    def get_user_by_stripe_customer_id(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Stripe customer ID."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, email, name, plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at
            FROM users
            WHERE stripe_customer_id = ?
            """,
            (customer_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "email": row[1],
            "name": row[2],
            "plan": row[3] if len(row) > 3 else "start",
            "stripe_customer_id": row[4] if len(row) > 4 else None,
            "stripe_subscription_id": row[5] if len(row) > 5 else None,
            "created_at": row[6] if len(row) > 6 else row[3],
            "updated_at": row[7] if len(row) > 7 else row[4],
        }
    
    def list_all_users(self) -> List[Dict[str, Any]]:
        """List all users (without passwords). For debugging/admin purposes."""
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT id, email, name, plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            """
        )
        rows = cur.fetchall()
        
        users = []
        for row in rows:
            users.append({
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "plan": row[3] if len(row) > 3 else "start",
                "stripe_customer_id": row[4] if len(row) > 4 else None,
                "stripe_subscription_id": row[5] if len(row) > 5 else None,
                "created_at": row[6] if len(row) > 6 else row[3],
                "updated_at": row[7] if len(row) > 7 else row[4],
            })
        
        return users
    
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

