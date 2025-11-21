"""Plan checking and validation with credits system."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import HTTPException, status

from api.plans import get_plan_config, is_unlimited
from api.users_db import get_users_db
from api.usage_db import get_usage_db
from api.documents_db import get_documents_db
from api.credits_db import get_credits_db
from api.credits import (
    calculate_query_cost,
    calculate_indexing_cost,
    calculate_embeddings_cost,
    calculate_pdf_exporter_cost,
    calculate_audit_agent_cost,
)
import sqlite3


def check_plan(
    user_id: int,
    action: str,
    **kwargs
) -> bool:
    """
    Check if user's plan allows the requested action.
    Raises HTTPException if not allowed.
    
    Actions:
    - "upload_document": requires extension in kwargs
    - "query": checks query limit
    - "create_workspace": checks workspace limit
    - "use_hybrid_retrieval": checks if plan supports hybrid
    - "export": requires format in kwargs
    """
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    plan_name = user.get("plan", "start")
    plan = get_plan_config(plan_name)
    usage_db = get_usage_db()
    
    if action == "upload_document":
        # Check file format
        extension = kwargs.get("extension", "").lower().lstrip(".")
        if plan["allowed_formats"] != "all":
            if extension not in plan["allowed_formats"]:
                format_list = ", ".join(plan["allowed_formats"])
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Filformatet .{extension} stöds inte på din plan ({plan_name}). Tillåtna format: {format_list}. Uppgradera till Pro eller Enterprise för fler format."
                )
        
        # Check specific format support
        if extension in ["csv", "xlsx"]:
            if not plan.get("csv_support", False) and extension == "csv":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSV-stöd kräver Pro-plan eller högre. Uppgradera din plan för att ladda upp CSV-filer."
                )
            if not plan.get("excel_support", False) and extension == "xlsx":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Excel-stöd kräver Pro-plan eller högre. Uppgradera din plan för att ladda upp Excel-filer."
                )
        
        # Check credits for indexing (will be deducted after successful upload)
        pages = kwargs.get("pages", 1)  # Default to 1 page if not provided
        cost = calculate_indexing_cost(pages)
        
        if not check_credits(user_id, cost, plan_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Otillräckliga credits för indexering ({cost:.1f} credits för {pages} sidor). Köp fler credits eller uppgradera din plan."
            )
        
        return True
    
    if action == "query":
        # Check credits for query
        cost = calculate_query_cost()
        
        if not check_credits(user_id, cost, plan_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Otillräckliga credits för fråga ({cost:.1f} credits). Köp fler credits eller uppgradera din plan."
            )
        
        return True
    
    if action == "create_workspace":
        # Check workspace limit
        if not is_unlimited(plan["max_workspaces"]):
            docs_db = get_documents_db()
            # Count unique workspaces (we'll need to add this to documents_db or use a separate workspaces table)
            # For now, we'll use a simple count from documents
            # TODO: Implement proper workspace counting
            used = 0  # Placeholder - will be implemented when workspace system is added
            if used >= plan["max_workspaces"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Du har nått max antal arbetsytor på din plan ({plan['max_workspaces']} arbetsytor). Uppgradera din plan för fler arbetsytor."
                )
        return True
    
    if action == "use_hybrid_retrieval":
        if not plan.get("hybrid_retrieval", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hybrid retrieval kräver Pro-plan eller högre. Din plan saknar hybrid retrieval."
            )
        return True
    
    if action == "export":
        export_format = kwargs.get("format", "").lower()
        if plan["export_formats"] != "all":
            if export_format not in plan["export_formats"]:
                format_list = ", ".join(plan["export_formats"])
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Export-formatet {export_format} stöds inte på din plan. Tillåtna format: {format_list}."
                )
        return True
    
    if action == "api_access":
        if not plan.get("api_access", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API-access kräver Enterprise-plan. Uppgradera din plan för API-access."
            )
        return True
    
    # Unknown action
    return True


def check_credits(user_id: int, required: float, plan_name: str) -> bool:
    """
    Check if user has enough credits.
    For subscription plans, checks monthly allocation first, then balance.
    For credit-only plans, checks balance only.
    """
    credits_db = get_credits_db()
    plan = get_plan_config(plan_name)
    
    # Enterprise with unlimited credits
    if plan_name == "enterprise" and is_unlimited(plan.get("credits_per_month", -1)):
        return True
    
    # Check monthly allocation for subscription plans
    if plan_name in ["start", "pro"]:
        monthly = credits_db.get_monthly_allocation(user_id)
        if monthly["remaining"] >= required:
            return True
        # If monthly allocation exhausted, check balance
        balance = credits_db.get_balance(user_id)
        if balance >= required:
            return True
        return False
    
    # Credit-only plan: check balance only
    balance = credits_db.get_balance(user_id)
    return balance >= required


def deduct_credits(user_id: int, amount: float, description: str) -> bool:
    """
    Deduct credits from user.
    For subscription plans, uses monthly allocation first, then balance.
    Returns True if successful.
    """
    credits_db = get_credits_db()
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    plan_name = user.get("plan", "start") if user else "start"
    plan = get_plan_config(plan_name)
    
    # Enterprise with unlimited credits: no deduction
    if plan_name == "enterprise" and is_unlimited(plan.get("credits_per_month", -1)):
        return True
    
    # For subscription plans, try monthly allocation first
    if plan_name in ["start", "pro"]:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{now.month:02d}"
        monthly = credits_db.get_monthly_allocation(user_id, month)
        if monthly["remaining"] >= amount:
            # Deduct from monthly allocation
            cur = credits_db.conn.cursor()
            try:
                cur.execute(
                    "UPDATE monthly_allocations SET used = used + ? WHERE user_id = ? AND month = ?",
                    (amount, user_id, month)
                )
                credits_db.conn.commit()
                return True
            except Exception as e:
                credits_db.conn.rollback()
                print(f"[plan_checker] Error deducting from monthly allocation: {e}")
                # Fall through to balance check
    
    # Deduct from balance
    return credits_db.use_credits(user_id, amount, description)


def get_usage_stats(user_id: int) -> Dict[str, Any]:
    """
    Get current usage statistics for a user.
    Returns dict with counts and limits.
    """
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    
    if not user:
        return {}
    
    plan_name = user.get("plan", "start")
    plan = get_plan_config(plan_name)
    credits_db = get_credits_db()
    
    # Get credit balance
    balance = credits_db.get_balance(user_id)
    
    # Get monthly allocation info
    monthly = credits_db.get_monthly_allocation(user_id)
    
    # Get workspace count (TODO: implement proper counting)
    workspaces_used = 0
    
    # Calculate credits per month from plan
    credits_per_month = plan.get("credits_per_month", 0)
    if is_unlimited(credits_per_month):
        credits_per_month = None  # Unlimited
    
    return {
        "plan": plan_name,
        "credits": {
            "balance": balance,
            "monthly_allocation": monthly["allocated"],
            "monthly_used": monthly["used"],
            "monthly_remaining": monthly["remaining"],
            "credits_per_month": credits_per_month,
            "unlimited": is_unlimited(plan.get("credits_per_month", 0)),
        },
        "workspaces": {
            "used": workspaces_used,
            "limit": plan["max_workspaces"],
            "unlimited": is_unlimited(plan["max_workspaces"]),
        },
        "features": {
            "hybrid_retrieval": plan.get("hybrid_retrieval", False),
            "csv_support": plan.get("csv_support", False),
            "excel_support": plan.get("excel_support", False),
            "api_access": plan.get("api_access", False),
            "sso": plan.get("sso", False),
        },
    }

