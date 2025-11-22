"""Stripe webhook handler for credit purchases."""
from __future__ import annotations

from typing import Dict, Any
from fastapi import Request, HTTPException, status, Header

from api.stripe_client import get_stripe_client, STRIPE_AVAILABLE, STRIPE_WEBHOOK_SECRET
from api.credits_db import get_credits_db
from api.users_db import get_users_db


async def handle_stripe_webhook_for_credits(
    request: Request,
    stripe_signature: str = Header(..., alias="stripe-signature"),
) -> Dict[str, str]:
    """
    Handle Stripe webhook events for credit purchases.
    
    TODO: Implement full webhook handling:
    - When payment_succeeded → call credits_db.add_credits(user_id, amount, expires_at)
    - Verify webhook signature
    - Handle payment failures
    """
    if not STRIPE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe är inte konfigurerat"
        )
    
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STRIPE_WEBHOOK_SECRET not configured"
        )
    
    stripe = get_stripe_client()
    body = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload=body,
            sig_header=stripe_signature,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook signature verification failed: {str(e)}"
        )
    
    # Handle different event types
    event_type = event["type"]
    data = event["data"]["object"]
    
    db = get_users_db()
    credits_db = get_credits_db()
    
    if event_type == "checkout.session.completed":
        # Payment completed - add credits
        metadata = data.get("metadata", {})
        user_id = int(metadata.get("user_id", 0))
        package_id = metadata.get("package_id", "")
        credits_amount = float(metadata.get("credits", 0))
        purchase_type = metadata.get("type", "")
        
        if purchase_type == "credits_purchase" and user_id and credits_amount > 0:
            # Add credits to user account
            # Credits expire after 12 months (365 days)
            credits_db.add_credits(
                user_id=user_id,
                amount=credits_amount,
                transaction_type="purchase",
                description=f"Köp: {credits_amount} credits ({package_id})",
                expires_days=365,
            )
            print(f"[webhook] Added {credits_amount} credits to user {user_id} from package {package_id}")
    
    elif event_type == "payment_intent.succeeded":
        # Alternative event for successful payment
        # TODO: Extract user_id and credits from payment intent metadata
        pass
    
    elif event_type == "payment_intent.payment_failed":
        # Payment failed
        # TODO: Log failure, notify user
        pass
    
    return {"status": "success"}

