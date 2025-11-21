"""Stripe client for payment processing."""
from __future__ import annotations

import os
from typing import Optional, Dict, Any

from dotenv import load_dotenv

# Ladda .env-fil lokalt
load_dotenv()

try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    stripe = None

# Stripe configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Price IDs - måste matcha Stripe Dashboard
# TODO: Uppdatera dessa med riktiga Price IDs från Stripe Dashboard
STRIPE_PRICE_IDS = {
    "start": os.getenv("STRIPE_PRICE_ID_START", "price_start_placeholder"),
    "pro": os.getenv("STRIPE_PRICE_ID_PRO", "price_pro_placeholder"),
    "enterprise": os.getenv("STRIPE_PRICE_ID_ENTERPRISE", "price_enterprise_placeholder"),
    "payg": os.getenv("STRIPE_PRICE_ID_PAYG", "price_payg_placeholder"),
}

# Reverse mapping: price_id -> plan_name
PRICE_ID_TO_PLAN = {v: k for k, v in STRIPE_PRICE_IDS.items() if v}

if STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    if STRIPE_SECRET_KEY.startswith("sk_test"):
        stripe.api_version = "2024-11-20.acacia"  # Use latest stable API version
    print("[stripe] Stripe initialized")
else:
    print("[stripe] VARNING: Stripe är inte konfigurerat. Sätt STRIPE_SECRET_KEY i .env")


def get_stripe_client():
    """Get Stripe client if available."""
    if not STRIPE_AVAILABLE:
        raise RuntimeError("Stripe package not installed. Install with: pip install stripe")
    if not STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY not set in environment")
    return stripe


def get_price_id_for_plan(plan_name: str) -> Optional[str]:
    """Get Stripe price ID for a plan name."""
    return STRIPE_PRICE_IDS.get(plan_name)


def get_plan_for_price_id(price_id: str) -> Optional[str]:
    """Get plan name for a Stripe price ID."""
    return PRICE_ID_TO_PLAN.get(price_id)


def create_checkout_session_for_credits(
    customer_id: str,
    package_id: str,
    success_url: str,
    cancel_url: str,
    user_id: int,
) -> str:
    """
    Create Stripe Checkout session for credit purchase.
    
    package_id: "credits_100" | "credits_500" | "credits_2000" | "credits_10000" | "credits_50000"
    Returns checkout URL.
    """
    from api.credits import get_credit_package
    
    package = get_credit_package(package_id.replace("credits_", ""))
    if not package:
        raise ValueError(f"Invalid package_id: {package_id}")
    
    credits = package.get("credits", 0)
    price_sek = package.get("price_sek", 0)
    
    if price_sek is None:
        raise ValueError(f"Package {package_id} requires quote")
    
    stripe = get_stripe_client()
    
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "sek",
                        "product_data": {
                            "name": f"{credits} Credits",
                            "description": f"Köp {credits} credits för din RAG-konto",
                        },
                        "unit_amount": int(price_sek * 100),  # Convert to öre
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user_id),
                "package_id": package_id,
                "credits": str(credits),
                "type": "credits_purchase",
            },
        )
        
        return session.url
    except Exception as e:
        raise RuntimeError(f"Kunde inte skapa checkout session: {str(e)}")

