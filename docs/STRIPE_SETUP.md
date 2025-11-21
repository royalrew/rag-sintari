# Stripe Integration Setup

## Översikt

Stripe-integrationen är implementerad och redo att användas. Detta dokument beskriver hur du konfigurerar och använder Stripe.

## 1. Stripe-konfiguration

### Miljövariabler i `.env`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # eller sk_live_... för produktion
STRIPE_PUBLISHABLE_KEY=pk_test_...  # eller pk_live_... för produktion
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret från Stripe Dashboard

# Stripe Price IDs (måste matcha Stripe Dashboard)
STRIPE_PRICE_ID_START=price_...  # Price ID för Start-plan
STRIPE_PRICE_ID_PRO=price_...  # Price ID för Pro-plan
STRIPE_PRICE_ID_ENTERPRISE=price_...  # Price ID för Enterprise-plan
STRIPE_PRICE_ID_PAYG=price_...  # Price ID för Pay-as-you-go (om används)
```

## 2. Skapa Products och Prices i Stripe Dashboard

1. Gå till Stripe Dashboard → Products
2. Skapa produkter för varje plan:
   - **Start** - 399 kr/månad
   - **Pro** - 1 290 kr/månad
   - **Enterprise** - 9 900 kr/månad
   - **Pay-as-you-go** (om används)

3. För varje produkt, skapa en **Recurring Price** (Subscription)
4. Kopiera **Price ID** (börjar med `price_...`) och lägg i `.env`

## 3. Konfigurera Webhooks

1. Gå till Stripe Dashboard → Developers → Webhooks
2. Klicka "Add endpoint"
3. Endpoint URL: `https://din-domain.com/billing/webhook`
4. Välj events att lyssna på:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Kopiera **Signing secret** (börjar med `whsec_...`) och lägg i `.env` som `STRIPE_WEBHOOK_SECRET`

## 4. Konfigurera Customer Portal (valfritt)

1. Gå till Stripe Dashboard → Settings → Billing → Customer portal
2. Aktivera Customer Portal
3. Konfigurera vilka funktioner kunder ska kunna använda:
   - Cancel subscription
   - Update payment method
   - View invoices
   - etc.

## 5. Testa Integrationen

### Lokal testning med Stripe CLI:

```bash
# Installera Stripe CLI
# Windows: choco install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Logga in
stripe login

# Forward webhooks till lokal server
stripe listen --forward-to localhost:8000/billing/webhook

# I en annan terminal, trigger test events
stripe trigger checkout.session.completed
```

### Testa checkout:

1. Starta servern: `uvicorn api.main:app --reload`
2. I frontend, gå till `/pricing`
3. Klicka "Välj Pro" (eller annan plan)
4. Du ska redirectas till Stripe Checkout
5. Använd test-kort: `4242 4242 4242 4242`
6. Efter lyckad betalning redirectas du till `/app/billing`

## 6. Implementerade Endpoints

### POST `/billing/checkout`
Skapar en Stripe Checkout session för subscription.

**Request:**
```json
{
  "priceId": "price_...",
  "successUrl": "https://din-domain.com/app/billing",
  "cancelUrl": "https://din-domain.com/pricing"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### POST `/billing/portal`
Skapar en Stripe Customer Portal session.

**Request:**
```json
{
  "returnUrl": "https://din-domain.com/app/billing"
}
```

**Response:**
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```

### GET `/billing/subscription`
Hämtar aktuell subscription-information.

**Response:**
```json
{
  "plan": "pro",
  "status": "active",
  "currentPeriodEnd": "2024-02-15T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_..."
}
```

### POST `/billing/webhook`
Webhook-endpoint för Stripe events (anropas av Stripe, inte frontend).

## 7. Automatisk Plan-uppdatering

När en kund:
- **Kompletterar checkout** → Plan uppdateras automatiskt via webhook
- **Uppgraderar/nedgraderar** → Plan uppdateras via Customer Portal + webhook
- **Avbryter subscription** → Plan sätts till "start" via webhook

## 8. Säkerhet

- ✅ Webhook-signaturer verifieras automatiskt
- ✅ Endpoints kräver authentication (utom webhook som verifierar Stripe-signatur)
- ✅ Customer ID kopplas till user_id i metadata
- ✅ Plan-uppdateringar sker endast via verifierade webhooks

## 9. Nästa Steg

1. Installera Stripe: `pip install stripe`
2. Sätt miljövariabler i `.env`
3. Skapa Products och Prices i Stripe Dashboard
4. Konfigurera webhooks
5. Testa med Stripe test-kort
6. Gå live med Stripe live keys

## 10. Felsökning

**Problem: "Stripe är inte konfigurerat"**
- Kontrollera att `STRIPE_SECRET_KEY` är satt i `.env`
- Kontrollera att `stripe` package är installerat: `pip install stripe`

**Problem: Webhook verifiering misslyckas**
- Kontrollera att `STRIPE_WEBHOOK_SECRET` är korrekt
- Använd Stripe CLI för lokal testning: `stripe listen --forward-to localhost:8000/billing/webhook`

**Problem: Plan uppdateras inte efter checkout**
- Kontrollera webhook-endpoint i Stripe Dashboard
- Kontrollera webhook logs i Stripe Dashboard
- Verifiera att webhook-secret är korrekt

