"""Billing endpoints for Stripe integration."""
from __future__ import annotations

import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status, Request, Header
from pydantic import BaseModel

from api.auth import get_current_user_id
from api.users_db import get_users_db
from api.stripe_client import (
    get_stripe_client,
    get_price_id_for_plan,
    get_plan_for_price_id,
    STRIPE_AVAILABLE,
    STRIPE_WEBHOOK_SECRET,
)
from api.plan_checker import get_usage_stats
from api.credits_db import get_credits_db
from api.plans import get_plan_config


class CheckoutRequest(BaseModel):
    priceId: str
    successUrl: str
    cancelUrl: str


class CheckoutResponse(BaseModel):
    checkoutUrl: str


class PortalRequest(BaseModel):
    returnUrl: str


class PortalResponse(BaseModel):
    portalUrl: str


class SubscriptionInfoResponse(BaseModel):
    plan: str
    status: str  # active | canceled | past_due | trialing
    currentPeriodEnd: Optional[str] = None
    cancelAtPeriodEnd: bool = False
    stripeCustomerId: Optional[str] = None
    stripeSubscriptionId: Optional[str] = None


async def create_checkout_session(
    request: CheckoutRequest,
    user_id: int = Depends(get_current_user_id),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout session for subscription.
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
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": request.priceId,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=request.successUrl,
            cancel_url=request.cancelUrl,
            metadata={
                "user_id": str(user_id),
            },
            allow_promotion_codes=True,
        )
        
        return CheckoutResponse(checkoutUrl=session.url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte skapa checkout session: {str(e)}"
        )


async def create_portal_session(
    request: PortalRequest,
    user_id: int = Depends(get_current_user_id),
) -> PortalResponse:
    """
    Create a Stripe Customer Portal session.
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
    
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ingen Stripe customer hittades. Skapa en subscription först."
        )
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=request.returnUrl,
        )
        
        return PortalResponse(portalUrl=session.url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte skapa portal session: {str(e)}"
        )


async def get_subscription_info(
    user_id: int = Depends(get_current_user_id),
) -> SubscriptionInfoResponse:
    """
    Get current subscription information.
    """
    try:
        db = get_users_db()
        user = db.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        subscription_id = user.get("stripe_subscription_id")
        customer_id = user.get("stripe_customer_id")
        
        # Get plan from user, default to "start"
        user_plan = user.get("plan", "start")
        
        # Default response (no subscription)
        response = SubscriptionInfoResponse(
            plan=user_plan,
            status="active",  # Default to active for free/start plan
            stripeCustomerId=customer_id,
            stripeSubscriptionId=subscription_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        # If anything goes wrong, return a safe default
        import traceback
        print(f"[billing] Error in get_subscription_info: {e}")
        print(f"[billing] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription info: {str(e)}"
        )
    
    # If we have a Stripe subscription, fetch details
    if STRIPE_AVAILABLE and subscription_id:
        try:
            stripe = get_stripe_client()
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Get plan from price ID
            price_id = subscription.items.data[0].price.id if subscription.items.data else None
            plan_name = None
            if price_id:
                plan_name = get_plan_for_price_id(price_id)
            
            # Use plan from Stripe if found, otherwise keep DB plan
            if plan_name:
                # Update user's plan in DB if it changed
                if plan_name != user.get("plan"):
                    db.update_user_plan(user_id, plan_name)
                response.plan = plan_name
            else:
                # Keep plan from DB if we can't map price ID
                response.plan = user.get("plan", "start")
            
            response.status = subscription.status
            if subscription.current_period_end:
                response.currentPeriodEnd = datetime.fromtimestamp(
                    subscription.current_period_end,
                    tz=timezone.utc
                ).isoformat()
            response.cancelAtPeriodEnd = subscription.cancel_at_period_end
            
        except Exception as e:
            # If subscription not found or error, return default from DB
            # Don't crash - just log and return what we have
            import traceback
            print(f"[billing] Error fetching subscription: {e}")
            print(f"[billing] Traceback: {traceback.format_exc()}")
            # Return response with DB plan (already set above)
            pass
    
    return response


async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="stripe-signature"),
) -> Dict[str, str]:
    """
    Handle Stripe webhook events.
    This endpoint should be called by Stripe when subscription events occur.
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
    
    if event_type == "checkout.session.completed":
        # Subscription created
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        user_id = int(data.get("metadata", {}).get("user_id", 0))
        
        if user_id and customer_id:
            # Get plan from price
            line_items = stripe.checkout.Session.list_line_items(data["id"])
            if line_items.data:
                price_id = line_items.data[0].price.id
                plan_name = get_plan_for_price_id(price_id) or "start"
                
                # Update user
                db.update_stripe_info(user_id, customer_id, subscription_id)
                db.update_user_plan(user_id, plan_name)
                
                # Allocate monthly credits for subscription plans
                if plan_name in ["start", "pro"]:
                    plan = get_plan_config(plan_name)
                    credits_per_month = plan.get("credits_per_month", 0)
                    if credits_per_month > 0:
                        credits_db = get_credits_db()
                        credits_db.allocate_monthly_credits(user_id, credits_per_month)
                        print(f"[webhook] Allocated {credits_per_month} credits to user {user_id} for plan {plan_name}")
                
                print(f"[webhook] Updated user {user_id} to plan {plan_name}")
    
    elif event_type == "customer.subscription.updated":
        # Subscription updated (plan change, etc.)
        customer_id = data.get("customer")
        subscription_id = data.get("id")
        
        user = db.get_user_by_stripe_customer_id(customer_id)
        if user:
            # Get plan from price
            price_id = data.get("items", {}).get("data", [{}])[0].get("price", {}).get("id")
            if price_id:
                plan_name = get_plan_for_price_id(price_id) or user.get("plan", "start")
                db.update_user_plan(user["id"], plan_name)
                db.update_stripe_info(user["id"], subscription_id=subscription_id)
                print(f"[webhook] Updated user {user['id']} to plan {plan_name}")
    
    elif event_type == "customer.subscription.deleted":
        # Subscription canceled
        customer_id = data.get("customer")
        user = db.get_user_by_stripe_customer_id(customer_id)
        if user:
            # Downgrade to start plan
            db.update_user_plan(user["id"], "start")
            db.update_stripe_info(user["id"], subscription_id=None)
            print(f"[webhook] Downgraded user {user['id']} to start plan")
    
    return {"status": "success"}

