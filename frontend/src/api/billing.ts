/**
 * Billing API
 * Handles subscription and payment operations
 */

import { apiPost, apiGet } from './client';
import { apiRoutes } from '@/config/apiRoutes';

export interface SubscriptionInfo {
  plan: 'start' | 'pro' | 'enterprise' | 'payg' | 'credits';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface CheckoutRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

/**
 * Create checkout session
 * POST /billing/checkout
 * Body: { priceId, successUrl, cancelUrl }
 * Returns: Stripe checkout URL
 */
export const createCheckoutSession = async (
  request: CheckoutRequest
): Promise<CheckoutResponse> => {
  return apiPost<CheckoutResponse>(apiRoutes.billing.checkout, request);
};

/**
 * Get billing portal URL
 * POST /billing/portal
 * Body: { returnUrl }
 * Returns: Stripe portal URL
 */
export const getBillingPortalUrl = async (
  returnUrl: string
): Promise<{ portalUrl: string }> => {
  return apiPost<{ portalUrl: string }>(apiRoutes.billing.portal, { returnUrl });
};

/**
 * Get subscription info
 * GET /billing/subscription
 * Returns: Current subscription details
 */
export const getSubscriptionInfo = async (): Promise<SubscriptionInfo> => {
  return apiGet<SubscriptionInfo>(apiRoutes.billing.subscription);
};

/**
 * Cancel subscription
 * Uses Stripe Customer Portal to cancel subscription.
 * Redirect user to portal instead of direct API call.
 */
export const cancelSubscription = async (): Promise<{ success: boolean }> => {
  // For cancellation, redirect to Stripe Customer Portal
  // where user can cancel themselves
  const returnUrl = window.location.origin + '/app/billing';
  const { portalUrl } = await getBillingPortalUrl(returnUrl);
  window.location.href = portalUrl;
  return { success: true };
};
