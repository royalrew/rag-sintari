"""Credit pricing and calculation."""
from __future__ import annotations

from typing import Dict, Any

# Credit costs for different actions
CREDIT_COSTS: Dict[str, float] = {
    "query": 1.0,  # 1 credit per query
    "index_page": 0.2,  # 0.2 credits per document page
    "embeddings_1k": 3.0,  # 3 credits per 1000 embeddings
    "pdf_exporter_agent": 5.0,  # 5 credits per PDF export
    "audit_agent": 10.0,  # 10 credits per audit
}

# Credit packages for pay-as-you-go
CREDIT_PACKAGES: Dict[str, Dict[str, Any]] = {
    "100": {
        "credits": 100,
        "price_sek": 99,
        "price_id": None,  # Will be set from Stripe
    },
    "500": {
        "credits": 500,
        "price_sek": 399,
        "price_id": None,
    },
    "2000": {
        "credits": 2000,
        "price_sek": 1299,
        "price_id": None,
    },
    "10000": {
        "credits": 10000,
        "price_sek": 4990,
        "bonus_percent": 15,  # +15% bonus
        "price_id": None,
    },
    "50000": {
        "credits": 50000,
        "price_sek": None,  # Requires quote
        "price_id": None,
    },
}


def calculate_query_cost() -> float:
    """Calculate credit cost for a query."""
    return CREDIT_COSTS["query"]


def calculate_indexing_cost(pages: int) -> float:
    """Calculate credit cost for indexing a document with N pages."""
    return pages * CREDIT_COSTS["index_page"]


def calculate_embeddings_cost(embedding_count: int) -> float:
    """Calculate credit cost for generating embeddings."""
    thousands = embedding_count / 1000.0
    return thousands * CREDIT_COSTS["embeddings_1k"]


def calculate_pdf_exporter_cost() -> float:
    """Calculate credit cost for PDF Exporter Agent."""
    return CREDIT_COSTS["pdf_exporter_agent"]


def calculate_audit_agent_cost() -> float:
    """Calculate credit cost for AuditAgent."""
    return CREDIT_COSTS["audit_agent"]


def get_credit_package(package_id: str) -> Dict[str, Any]:
    """Get credit package by ID."""
    # Support both "100" and "credits_100" formats
    if package_id.startswith("credits_"):
        package_id = package_id.replace("credits_", "")
    return CREDIT_PACKAGES.get(package_id, {})

