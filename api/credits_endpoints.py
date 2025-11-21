"""Credits API endpoints."""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel

from api.auth import get_current_user_id
from api.users_db import get_users_db
from api.credits_db import get_credits_db
from api.plan_checker import get_usage_stats
from api.plans import get_plan_config
from api.stripe_client import create_checkout_session_for_credits, get_stripe_client, STRIPE_AVAILABLE


class CreditsBalanceResponse(BaseModel):
    current_balance: float
    monthly_allocation: float
    month_used: float
    month_remaining: float
    plan: str
    expires_soon: List[Dict[str, Any]]


class CreditsHistoryResponse(BaseModel):
    transactions: List[Dict[str, Any]]
    total: int


class CheckoutRequest(BaseModel):
    package_id: str  # "credits_100" | "credits_500" | etc.


class CheckoutResponse(BaseModel):
    checkout_url: str


async def get_credits_balance(
    user_id: int = Depends(get_current_user_id),
) -> CreditsBalanceResponse:
    """
    Get current credits balance and allocation info.
    """
    credits_db = get_credits_db()
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    plan_name = user.get("plan", "start")
    plan = get_plan_config(plan_name)
    
    # Get current balance
    current_balance = credits_db.get_balance(user_id)
    
    # Get monthly allocation
    now = datetime.now(timezone.utc)
    month = f"{now.year}-{now.month:02d}"
    monthly = credits_db.get_monthly_allocation(user_id, month)
    
    monthly_allocation = monthly["allocated"]
    month_used = monthly["used"]
    month_remaining = monthly["remaining"]
    
    # Get credits expiring soon (within 30 days)
    expires_soon = credits_db.get_expiring_credits(user_id, days=30)
    
    return CreditsBalanceResponse(
        current_balance=current_balance,
        monthly_allocation=monthly_allocation,
        month_used=month_used,
        month_remaining=month_remaining,
        plan=plan_name,
        expires_soon=expires_soon,
    )


async def get_credits_history(
    user_id: int = Depends(get_current_user_id),
    limit: int = 50,
    offset: int = 0,
) -> CreditsHistoryResponse:
    """
    Get credit transaction history.
    """
    credits_db = get_credits_db()
    
    transactions = credits_db.get_transaction_history(user_id, limit=limit, offset=offset)
    
    # Get total count for pagination
    cur = credits_db.conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM credit_transactions WHERE user_id = ?",
        (user_id,)
    )
    result = cur.fetchone()
    total = int(result[0]) if result and result[0] is not None else 0
    
    # Format transactions for response
    formatted = []
    for tx in transactions:
        # Map internal types to user-friendly types
        tx_type = tx["type"]
        if tx_type == "allocation":
            tx_type = "monthly_allocation"
        elif tx_type == "usage":
            tx_type = "usage"
        elif tx_type == "purchase":
            tx_type = "purchase"
        elif tx_type == "expiration":
            tx_type = "expiration"
        elif tx_type == "refund":
            tx_type = "refund"
        elif tx_type == "bonus":
            tx_type = "bonus"
        
        formatted.append({
            "id": tx["id"],
            "timestamp": tx["created_at"],
            "type": tx_type,
            "amount": tx["amount"],
            "description": tx["description"],
            "balance_after": tx["balance_after"],
            "expires_at": tx.get("expires_at"),
        })
    
    return CreditsHistoryResponse(
        transactions=formatted,
        total=total,
    )


async def create_credits_checkout(
    request: CheckoutRequest,
    user_id: int = Depends(get_current_user_id),
) -> CheckoutResponse:
    """
    Create Stripe Checkout session for credit purchase.
    """
    if not STRIPE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe är inte konfigurerat. Kontakta support."
        )
    
    stripe = get_stripe_client()
    db = get_users_db()
    user = db.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get or create Stripe customer
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=user["email"],
                name=user["name"],
                metadata={"user_id": str(user_id)},
            )
            customer_id = customer.id
            db.update_stripe_info(user_id, customer_id=customer_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Kunde inte skapa Stripe customer: {str(e)}"
            )
    
    # Create checkout session
    try:
        # Get base URL from request (or use default)
        # In production, use actual domain
        base_url = "http://localhost:3000"  # TODO: Get from env or request
        
        checkout_url = create_checkout_session_for_credits(
            customer_id=customer_id,
            package_id=request.package_id,
            success_url=f"{base_url}/app/account?success=credits",
            cancel_url=f"{base_url}/app/account?cancel=credits",
            user_id=user_id,
        )
        
        return CheckoutResponse(checkout_url=checkout_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte skapa checkout session: {str(e)}"
        )

