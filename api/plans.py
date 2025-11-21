"""Plan configurations and limits."""
from __future__ import annotations

from typing import Dict, Any, List, Optional

# Plan configurations - Credits-based system
PLANS: Dict[str, Dict[str, Any]] = {
    "start": {
        "credits_per_month": 500,  # 500 credits included per month
        "max_workspaces": 3,
        "allowed_formats": ["pdf", "docx", "txt", "md"],
        "hybrid_retrieval": False,
        "csv_support": False,
        "excel_support": False,
        "export_formats": ["txt", "pdf"],
        "history_days": 30,
        "max_users": 1,
        "api_access": False,
        "sso": False,
        "private_instance": False,
        "priority_support": False,
    },
    "pro": {
        "credits_per_month": 3000,  # 3000 credits included per month
        "max_workspaces": 10,
        "allowed_formats": ["pdf", "docx", "txt", "md", "csv", "xlsx"],
        "hybrid_retrieval": True,
        "csv_support": True,
        "excel_support": True,
        "export_formats": ["txt", "pdf", "docx", "xlsx"],
        "history_days": 365,
        "max_users": 5,
        "api_access": False,
        "sso": False,
        "private_instance": False,
        "priority_support": False,
    },
    "enterprise": {
        "credits_per_month": -1,  # unlimited credits with SLA
        "credits_pool_min": 50000,  # minimum pool per month (can be customized)
        "credits_pool_max": 250000,  # maximum pool per month (can be customized)
        "max_workspaces": -1,  # unlimited
        "allowed_formats": "all",
        "hybrid_retrieval": True,
        "csv_support": True,
        "excel_support": True,
        "export_formats": "all",
        "history_days": 9999,  # effectively unlimited
        "max_users": -1,  # unlimited
        "api_access": True,
        "sso": True,
        "private_instance": True,
        "priority_support": True,
    },
    "credits": {  # Pay-as-you-go: buy credits without monthly subscription
        "credits_per_month": 0,  # no monthly credits, must purchase
        "max_workspaces": -1,  # unlimited (same as pro)
        "allowed_formats": ["pdf", "docx", "txt", "md", "csv", "xlsx"],
        "hybrid_retrieval": True,
        "csv_support": True,
        "excel_support": True,
        "export_formats": ["txt", "pdf", "docx", "xlsx"],
        "history_days": 365,
        "max_users": 1,  # can add more
        "api_access": False,
        "sso": False,
        "private_instance": False,
        "priority_support": False,
        "credit_based": True,  # Special flag for credit-only plans
    },
}


def get_plan_config(plan_name: str) -> Dict[str, Any]:
    """Get plan configuration by name."""
    if plan_name not in PLANS:
        # Default to start plan if invalid
        return PLANS["start"]
    return PLANS[plan_name]


def is_unlimited(value: int) -> bool:
    """Check if a limit value means unlimited."""
    return value == -1


