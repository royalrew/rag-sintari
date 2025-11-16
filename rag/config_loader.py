from __future__ import annotations

import os
from typing import Any, Dict

from dotenv import load_dotenv

try:
    import yaml  # type: ignore
except Exception as exc:  # pragma: no cover
    raise RuntimeError(
        "PyYAML is required to load config/rag_config.yaml. "
        "Install with: pip install pyyaml"
    ) from exc


def load_env(env_path: str = ".env") -> None:
    """
    Load environment variables from .env if present.
    Safe to call multiple times.
    """
    force_override = os.getenv("RAG_ENV_FORCE", "").strip() == "1"

    # 1) Explicit path via arg or env var
    explicit_path = os.getenv("RAG_ENV_PATH", env_path).strip()
    if explicit_path and os.path.exists(explicit_path):
        load_dotenv(dotenv_path=explicit_path, override=force_override)
        return

    # 2) CWD .env
    if os.path.exists(".env"):
        load_dotenv(dotenv_path=".env", override=force_override)
        return

    # 3) Project root .env (one level up from this file's dir)
    module_dir = os.path.dirname(__file__)
    project_root = os.path.abspath(os.path.join(module_dir, ".."))
    root_env = os.path.join(project_root, ".env")
    if os.path.exists(root_env):
        load_dotenv(dotenv_path=root_env, override=force_override)
        return


def get_openai_api_key(env_var: str = "OPENAI_API_KEY") -> str:
    api_key = os.getenv(env_var, "").strip()
    if not api_key:
        raise RuntimeError(
            f"Missing {env_var}. Set it in your environment or .env file."
        )
    return api_key


def load_yaml_config(path: str = "config/rag_config.yaml") -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_config(env_path: str = ".env", yaml_path: str = "config/rag_config.yaml") -> Dict[str, Any]:
    """
    Loads .env and YAML config, validates essential fields and returns a dict.
    """
    load_env(env_path)
    # Validate essential secret
    _ = get_openai_api_key()
    config = load_yaml_config(yaml_path)
    return config


