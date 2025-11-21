"""Database for credit tracking and management."""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional


class CreditsDB:
    """
    SQLite database for credit tracking.
    Tracks:
    - User credit balance
    - Credit transactions (purchases, usage, expiration)
    - Monthly credit allocations
    """
    
    def __init__(self, db_path: str = "./.rag_state/credits.db"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()
    
    def _init_schema(self) -> None:
        """Create credits tables if they don't exist."""
        cur = self.conn.cursor()
        
        # User credit balances
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_credits (
              user_id INTEGER PRIMARY KEY,
              balance REAL NOT NULL DEFAULT 0.0,
              last_updated TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """
        )
        
        # Credit transactions (purchases, usage, allocations)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS credit_transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              type TEXT NOT NULL,
              description TEXT,
              expires_at TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
              FOREIGN KEY (user_id) REFERENCES user_credits(user_id)
            );
            """
        )
        
        # Monthly credit allocations (for subscription plans)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS monthly_allocations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              month TEXT NOT NULL,
              credits REAL NOT NULL,
              used REAL NOT NULL DEFAULT 0.0,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
              UNIQUE(user_id, month)
            );
            """
        )
        
        # Indexes
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_user ON credit_transactions(user_id, created_at DESC);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_allocations_user_month ON monthly_allocations(user_id, month);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_transactions_expires ON credit_transactions(expires_at) WHERE expires_at IS NOT NULL;"
        )
        
        self.conn.commit()
    
    def get_balance(self, user_id: int) -> float:
        """Get current credit balance for user."""
        cur = self.conn.cursor()
        cur.execute(
            "SELECT balance FROM user_credits WHERE user_id = ?",
            (user_id,)
        )
        row = cur.fetchone()
        if row:
            return float(row[0])
        # Initialize if doesn't exist
        self._initialize_user(user_id)
        return 0.0
    
    def _initialize_user(self, user_id: int) -> None:
        """Initialize user in credits table."""
        cur = self.conn.cursor()
        try:
            cur.execute(
                "INSERT INTO user_credits (user_id, balance, last_updated) VALUES (?, 0.0, ?)",
                (user_id, datetime.now(timezone.utc).isoformat())
            )
            self.conn.commit()
        except sqlite3.IntegrityError:
            # User already exists
            pass
    
    def add_credits(
        self,
        user_id: int,
        amount: float,
        transaction_type: str = "purchase",
        description: Optional[str] = None,
        expires_days: int = 365,  # Credits expire after 12 months
    ) -> None:
        """
        Add credits to user balance.
        transaction_type: "purchase" | "allocation" | "refund" | "bonus"
        """
        self._initialize_user(user_id)
        
        expires_at = None
        if expires_days > 0:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_days)).isoformat()
        
        cur = self.conn.cursor()
        try:
            # Update balance
            cur.execute(
                "UPDATE user_credits SET balance = balance + ?, last_updated = ? WHERE user_id = ?",
                (amount, datetime.now(timezone.utc).isoformat(), user_id)
            )
            
            # Log transaction
            cur.execute(
                """
                INSERT INTO credit_transactions (user_id, amount, type, description, expires_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, amount, transaction_type, description, expires_at)
            )
            
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(f"[credits_db] Error adding credits: {e}")
            raise
    
    def use_credits(
        self,
        user_id: int,
        amount: float,
        description: Optional[str] = None,
    ) -> bool:
        """
        Deduct credits from user balance.
        Returns True if successful, False if insufficient credits.
        """
        self._initialize_user(user_id)
        
        cur = self.conn.cursor()
        try:
            # Check balance
            balance = self.get_balance(user_id)
            if balance < amount:
                return False
            
            # Update balance
            cur.execute(
                "UPDATE user_credits SET balance = balance - ?, last_updated = ? WHERE user_id = ?",
                (amount, datetime.now(timezone.utc).isoformat(), user_id)
            )
            
            # Log transaction
            cur.execute(
                """
                INSERT INTO credit_transactions (user_id, amount, type, description)
                VALUES (?, ?, 'usage', ?)
                """,
                (user_id, -amount, description)
            )
            
            self.conn.commit()
            return True
        except Exception as e:
            self.conn.rollback()
            print(f"[credits_db] Error using credits: {e}")
            return False
    
    def allocate_monthly_credits(self, user_id: int, credits: float, month: Optional[str] = None) -> None:
        """
        Allocate monthly credits for subscription plans.
        month format: "YYYY-MM" (defaults to current month)
        """
        if month is None:
            now = datetime.now(timezone.utc)
            month = f"{now.year}-{now.month:02d}"
        
        cur = self.conn.cursor()
        try:
            # Check if allocation exists
            cur.execute(
                "SELECT id FROM monthly_allocations WHERE user_id = ? AND month = ?",
                (user_id, month)
            )
            if cur.fetchone():
                # Update existing
                cur.execute(
                    "UPDATE monthly_allocations SET credits = ? WHERE user_id = ? AND month = ?",
                    (credits, user_id, month)
                )
            else:
                # Create new
                cur.execute(
                    """
                    INSERT INTO monthly_allocations (user_id, month, credits, used)
                    VALUES (?, ?, ?, 0.0)
                    """,
                    (user_id, month, credits)
                )
            
            # Add to balance
            self.add_credits(
                user_id,
                credits,
                transaction_type="allocation",
                description=f"Monthly allocation for {month}",
                expires_days=0,  # Monthly credits don't expire separately
            )
            
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(f"[credits_db] Error allocating monthly credits: {e}")
            raise
    
    def get_monthly_allocation(self, user_id: int, month: Optional[str] = None) -> Dict[str, Any]:
        """Get monthly allocation info for a user."""
        if month is None:
            now = datetime.now(timezone.utc)
            month = f"{now.year}-{now.month:02d}"
        
        cur = self.conn.cursor()
        cur.execute(
            "SELECT credits, used FROM monthly_allocations WHERE user_id = ? AND month = ?",
            (user_id, month)
        )
        row = cur.fetchone()
        if row:
            return {
                "allocated": float(row[0]),
                "used": float(row[1]),
                "remaining": float(row[0]) - float(row[1]),
            }
        return {"allocated": 0.0, "used": 0.0, "remaining": 0.0}
    
    def get_transaction_history(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get recent credit transactions for a user with balance_after."""
        cur = self.conn.cursor()
        
        # Get transactions with running balance
        cur.execute(
            """
            SELECT 
                id, 
                amount, 
                type, 
                description, 
                expires_at, 
                created_at
            FROM credit_transactions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (user_id, limit, offset)
        )
        rows = cur.fetchall()
        
        # Calculate balance_after for each transaction
        # We need to sum all transactions up to that point
        transactions = []
        for row in rows:
            tx_id = row[0]
            # Get balance after this transaction (sum all transactions up to and including this one)
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM credit_transactions
                WHERE user_id = ? AND created_at <= (
                    SELECT created_at FROM credit_transactions WHERE id = ?
                )
                """,
                (user_id, tx_id)
            )
            balance_result = cur.fetchone()
            balance_after = float(balance_result[0]) if balance_result else 0.0
            
            transactions.append({
                "id": row[0],
                "amount": float(row[1]),
                "type": row[2],
                "description": row[3] or "",
                "expires_at": row[4],
                "created_at": row[5],
                "balance_after": balance_after,
            })
        
        return transactions
    
    def get_expiring_credits(self, user_id: int, days: int = 30) -> List[Dict[str, Any]]:
        """Get credits that expire within N days."""
        from datetime import timedelta
        expires_before = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT amount, expires_at
            FROM credit_transactions
            WHERE user_id = ?
              AND expires_at IS NOT NULL
              AND expires_at <= ?
              AND expires_at > ?
              AND type IN ('purchase', 'bonus')
              AND amount > 0
            ORDER BY expires_at ASC
            """,
            (user_id, expires_before, datetime.now(timezone.utc).isoformat())
        )
        rows = cur.fetchall()
        return [
            {
                "amount": float(row[0]),
                "expires_at": row[1],
            }
            for row in rows
        ]
    
    def expire_old_credits(self) -> int:
        """
        Expire credits that have passed their expiration date.
        Returns number of expired transactions.
        """
        now = datetime.now(timezone.utc).isoformat()
        cur = self.conn.cursor()
        
        # Find expired transactions that haven't been expired yet
        cur.execute(
            """
            SELECT user_id, SUM(amount) as total
            FROM credit_transactions
            WHERE expires_at IS NOT NULL
              AND expires_at < ?
              AND type IN ('purchase', 'bonus')
            GROUP BY user_id
            """,
            (now,)
        )
        expired = cur.fetchall()
        
        # Deduct expired credits from balance
        count = 0
        for user_id, amount in expired:
            balance = self.get_balance(user_id)
            if balance > 0:
                deduct = min(balance, abs(amount))
                if deduct > 0:
                    cur.execute(
                        "UPDATE user_credits SET balance = balance - ? WHERE user_id = ?",
                        (deduct, user_id)
                    )
                    cur.execute(
                        """
                        INSERT INTO credit_transactions (user_id, amount, type, description)
                        VALUES (?, ?, 'expiration', 'Credits expired')
                        """,
                        (user_id, -deduct)
                    )
                    count += 1
        
        self.conn.commit()
        return count
    
    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# Global instance
_credits_db: Optional[CreditsDB] = None


def get_credits_db() -> CreditsDB:
    """Get or create the global CreditsDB instance."""
    global _credits_db
    if _credits_db is None:
        _credits_db = CreditsDB()
    return _credits_db

