from __future__ import annotations

import os
import sys
from collections import defaultdict
from typing import Dict, List, Tuple, Optional


def _project_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def read_plan_csv(path: str) -> List[Dict[str, str]]:
    """
    Robust parser för plan.csv där beskrivning/notering kan innehålla kommatecken utan citat.
    Antagen kolumnordning:
      steg,id,område,beskrivning,leverans,notering
    Vi tar:
      - första 3 fälten: steg,id,område
      - sista 2 fälten: leverans,notering
      - mitten sammanslaget med komma: beskrivning
    """
    results: List[Dict[str, str]] = []
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()

    if not lines:
        return results

    # Skip header (assume first line is header)
    header = lines[0].strip()
    for line in lines[1:]:
        if not line or not line.strip():
            continue
        parts = line.rstrip().split(",")
        if len(parts) < 5:
            # Not enough columns; skip
            continue
        steg = parts[0].strip()
        id_ = parts[1].strip()
        omrade = parts[2].strip()
        leverans = parts[-2].strip()
        notering = parts[-1].strip()
        beskrivning = ",".join(p.strip() for p in parts[3:-2]) if len(parts) > 5 else ""

        row = {
            "steg": steg,
            "id": id_,
            "område": omrade,
            "beskrivning": beskrivning,
            "leverans": leverans,
            "notering": notering,
        }
        results.append(row)
    return results


def _is_plausible_path(value: str) -> bool:
    if not value:
        return False
    v = value.strip()
    if not v or " " in v or "(" in v or ")" in v:
        return False
    # Must look like a path or filename with extension
    if "/" in v:
        return True
    if "." in v and len(v.split(".")[-1]) in (2, 3, 4, 5):
        return True
    return False


def _should_skip_missing(path: str) -> bool:
    # Runtime/generated outputs
    return path.startswith("logs/") or path.startswith("reports/") or "*" in path


def _resolve_path(root: str, path: str) -> Optional[str]:
    """Return absolute existing path if found; try exact, then filename search in known dirs."""
    abs_path = os.path.join(root, path)
    if os.path.exists(abs_path):
        return abs_path
    # Try filename search in common roots
    filename = os.path.basename(path)
    search_dirs = ["docs", "ingest", "rag", "evaluation", "tests", "stress", "config", "cli", "spikes", "reports", "logs"]
    candidates: List[str] = []
    for d in search_dirs:
        base = os.path.join(root, d)
        for dirpath, _, files in os.walk(base):
            if filename in files:
                candidates.append(os.path.join(dirpath, filename))
    if len(candidates) == 1:
        return candidates[0]
    # If multiple or none, consider not resolved
    return None


def validate_deliverables(plan_rows: List[Dict[str, str]], root: str) -> Tuple[List[str], List[str]]:
    missing: List[str] = []
    duplicates: List[str] = []

    path_to_rows: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    for r in plan_rows:
        target = r.get("leverans", "").strip()
        if not target or not _is_plausible_path(target):
            # No deliverable path provided; skip
            continue
        path_to_rows[target].append(r)

    for target, rows in path_to_rows.items():
        if len(rows) > 1:
            duplicates.append(target)

        if _should_skip_missing(target):
            continue

        resolved = _resolve_path(root, target)
        if not resolved:
            missing.append(target)

    return missing, duplicates


def main(argv: List[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    root = _project_root()
    plan_path = os.path.join(root, "plan.csv")
    if len(argv) >= 1 and argv[0]:
        plan_path = argv[0]
        if not os.path.isabs(plan_path):
            plan_path = os.path.join(root, plan_path)

    print("Plan file check\n----------------")
    print(f"root: {root}")
    print(f"plan: {plan_path}")

    if not os.path.exists(plan_path):
        print(f"[FAIL] plan.csv not found at: {plan_path}")
        return 1

    try:
        rows = read_plan_csv(plan_path)
    except Exception as e:
        print(f"[FAIL] Could not read CSV: {e}")
        return 1

    missing, duplicates = validate_deliverables(rows, root)

    if duplicates:
        print("\n[WARN] Duplicate deliverable paths in plan.csv (shared targets across steps):")
        for p in duplicates:
            print(f" - {p}")

    if missing:
        print("\n[FAIL] Missing deliverable files/dirs (not found on disk):")
        for p in missing:
            print(f" - {p}")

    if not missing:
        print("\nAll deliverables present and unique.")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())


