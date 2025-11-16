from __future__ import annotations

import sys
from typing import Any, Dict, List

from rag.config_loader import load_config, get_openai_api_key, load_env


def _err(msg: str) -> None:
    print(f"[FAIL] {msg}")


def _ok(msg: str) -> None:
    print(f"[OK] {msg}")


def _validate_config(cfg: Dict[str, Any]) -> List[str]:
    errors: List[str] = []

    # models
    models = cfg.get("models") or {}
    if not isinstance(models, dict):
        errors.append("models: missing or not a mapping")
        return errors

    if not (emb := models.get("embeddings")):
        errors.append("models.embeddings: missing")

    llm = models.get("llm") or {}
    if not isinstance(llm, dict):
        errors.append("models.llm: missing or not a mapping")
    else:
        for key in ("answer", "summary", "extract"):
            if not llm.get(key):
                errors.append(f"models.llm.{key}: missing")

    # index
    index_cfg = cfg.get("index") or {}
    allowed_index_types = {"chroma", "faiss", "pgvector"}
    idx_type = index_cfg.get("type")
    if idx_type not in allowed_index_types:
        errors.append("index.type: must be one of chroma|faiss|pgvector")

    # retrieval
    retrieval = cfg.get("retrieval") or {}
    top_k = retrieval.get("top_k")
    if not isinstance(top_k, int) or top_k <= 0:
        errors.append("retrieval.top_k: must be a positive integer")

    # chunking
    chunking = cfg.get("chunking") or {}
    t = chunking.get("target_tokens")
    o = chunking.get("overlap_tokens")
    if not isinstance(t, int) or t <= 0:
        errors.append("chunking.target_tokens: must be positive int")
    if not isinstance(o, int) or o < 0:
        errors.append("chunking.overlap_tokens: must be non-negative int")

    return errors


def main() -> int:
    print("RAG sanity check\n-----------------")

    # Ensure .env is loaded before checking key
    try:
        load_env()  # respects RAG_ENV_PATH and RAG_ENV_FORCE
    except Exception as e:
        print(f"[FAIL] Could not load .env: {e}")
        return 1

    # .env and API key
    try:
        _ = get_openai_api_key()
        _ok("OPENAI_API_KEY loaded")
    except Exception as e:
        _err(str(e))
        return 1

    # YAML config
    try:
        cfg = load_config()  # also loads .env internally
        _ok("config/rag_config.yaml loaded")
    except Exception as e:
        _err(f"Failed to load config: {e}")
        return 1

    # Validate required fields
    errors = _validate_config(cfg)
    if errors:
        for e in errors:
            _err(e)
        return 1

    # Brief summary (no secrets)
    models = cfg.get("models", {})
    llm = (models.get("llm") or {})
    print("\nSummary:")
    print(f"- embeddings: {models.get('embeddings')}")
    print(f"- llm.answer: {llm.get('answer')}")
    print(f"- llm.summary: {llm.get('summary')}")
    print(f"- index.type: {cfg.get('index', {}).get('type')}")
    print(f"- retrieval.top_k: {cfg.get('retrieval', {}).get('top_k')}")
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


