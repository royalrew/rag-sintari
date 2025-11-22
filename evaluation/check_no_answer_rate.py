"""
Check no_answer rate from query logs.

Fails build if:
- no_answer_rate > MAX_NO_ANSWER (e.g. 0.25) - System är för fegt, säger "jag hittar inte" för ofta
- no_answer_rate < MIN_NO_ANSWER (e.g. 0.01) - System är för kaxigt, hittar på svar

Usage:
    python -m evaluation.check_no_answer_rate [--limit N] [--max-rate 0.25] [--min-rate 0.01]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Any


DEFAULT_LOG_PATH = Path("logs/rag_queries.jsonl")
DEFAULT_MAX_RATE = 0.25  # 25% max no_answer rate
DEFAULT_MIN_RATE = 0.01  # 1% min no_answer rate (för kaxighet)
DEFAULT_LIMIT = 500  # Senaste N queries


def load_recent_queries(log_path: Path, limit: int) -> List[Dict[str, Any]]:
    """Ladda senaste N queries från loggfil."""
    if not log_path.exists():
        print(f"[WARN] Log file not found: {log_path}")
        return []
    
    queries = []
    try:
        with log_path.open("r", encoding="utf-8") as f:
            lines = f.readlines()
            # Ta senaste N rader
            recent_lines = lines[-limit:] if len(lines) > limit else lines
            
            for line in recent_lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    queries.append(record)
                except json.JSONDecodeError:
                    continue
    
    except Exception as e:
        print(f"[ERROR] Failed to read log file: {e}")
        return []
    
    return queries


def calculate_no_answer_rate(queries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Beräkna no_answer rate från queries."""
    if not queries:
        return {
            "total": 0,
            "no_answer_count": 0,
            "no_answer_rate": 0.0,
            "no_answer_queries": [],
        }
    
    total = len(queries)
    no_answer_count = 0
    no_answer_queries = []
    
    for q in queries:
        # Check both meta.no_answer and direct no_answer field
        meta = q.get("meta", {}) or {}
        no_answer = q.get("no_answer") or meta.get("no_answer", False)
        
        if no_answer:
            no_answer_count += 1
            no_answer_queries.append({
                "query": q.get("query", "N/A"),
                "timestamp": q.get("timestamp", "N/A"),
                "mode": q.get("mode", "N/A"),
            })
    
    no_answer_rate = no_answer_count / total if total > 0 else 0.0
    
    return {
        "total": total,
        "no_answer_count": no_answer_count,
        "no_answer_rate": no_answer_rate,
        "no_answer_queries": no_answer_queries[:10],  # Visa max 10 för debug
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check no_answer rate from query logs."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Number of recent queries to check (default: {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--max-rate",
        type=float,
        default=DEFAULT_MAX_RATE,
        help=f"Max allowed no_answer rate (default: {DEFAULT_MAX_RATE})",
    )
    parser.add_argument(
        "--min-rate",
        type=float,
        default=DEFAULT_MIN_RATE,
        help=f"Min required no_answer rate (default: {DEFAULT_MIN_RATE})",
    )
    parser.add_argument(
        "--log-path",
        type=str,
        default=str(DEFAULT_LOG_PATH),
        help=f"Path to query log file (default: {DEFAULT_LOG_PATH})",
    )
    args = parser.parse_args()
    
    log_path = Path(args.log_path)
    
    print(f"[check] Loading queries from: {log_path}")
    queries = load_recent_queries(log_path, args.limit)
    
    if not queries:
        print(f"[WARN] No queries found in log. Skipping check.")
        return 0  # Don't fail build if no logs exist yet
    
    stats = calculate_no_answer_rate(queries)
    
    print(f"\n[check] No-Answer Rate Analysis")
    print(f"Total queries: {stats['total']}")
    print(f"No-answer count: {stats['no_answer_count']}")
    print(f"No-answer rate: {stats['no_answer_rate']:.2%}")
    print(f"Max allowed: {args.max_rate:.2%}")
    print(f"Min required: {args.min_rate:.2%}")
    
    # Check KPI limits
    errors = []
    
    if stats['no_answer_rate'] > args.max_rate:
        errors.append(
            f"No-answer rate {stats['no_answer_rate']:.2%} exceeds max allowed {args.max_rate:.2%}. "
            f"System är för fegt, säger 'jag hittar inte' för ofta."
        )
    
    if stats['no_answer_rate'] < args.min_rate and stats['total'] >= 10:
        # Only check min if we have enough data
        errors.append(
            f"No-answer rate {stats['no_answer_rate']:.2%} is below min required {args.min_rate:.2%}. "
            f"System är för kaxigt, kan hitta på svar istället för att erkänna att det inte vet."
        )
    
    if errors:
        print("\n[FAIL] KPI limits violated:")
        for error in errors:
            print(f"  ❌ {error}")
        
        if stats['no_answer_queries']:
            print("\n[DEBUG] Sample no-answer queries:")
            for q in stats['no_answer_queries'][:5]:
                print(f"  - {q['query'][:60]}... (mode: {q['mode']}, time: {q['timestamp'][:19]})")
        
        return 1  # Fail build
    
    print("\n[PASS] No-answer rate within acceptable limits ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())

