/**
 * Billing API
 * Handles subscription and payment operations
 */

import { apiPost, apiGet } from './client';
import { apiRoutes } from '@/config/apiRoutes';

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
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
 * POST /api/billing/checkout
 * Body: { priceId, successUrl, cancelUrl }
 * Returns: Stripe checkout URL
 */
export const createCheckoutSession = async (
  request: CheckoutRequest
): Promise<CheckoutResponse> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<CheckoutResponse>(apiRoutes.billing.checkout, request);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        checkoutUrl: 'https://checkout.stripe.com/mock-session',
      });
    }, 500);
  });
};

/**
 * Get billing portal URL
 * POST /api/billing/portal
 * Body: { returnUrl }
 * Returns: Stripe portal URL
 */
export const getBillingPortalUrl = async (
  returnUrl: string
): Promise<{ portalUrl: string }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<{ portalUrl: string }>(apiRoutes.billing.portal, { returnUrl });
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        portalUrl: 'https://billing.stripe.com/mock-portal',
      });
    }, 500);
  });
};

/**
 * Get subscription info
 * GET /api/billing/subscription
 * Returns: Current subscription details
 */
export const getSubscriptionInfo = async (): Promise<SubscriptionInfo> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<SubscriptionInfo>(apiRoutes.billing.subscription);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: '2024-02-15',
        cancelAtPeriodEnd: false,
      });
    }, 100);
  });
};

/**
 * Cancel subscription
 * POST /api/billing/cancel
 * Cancels subscription at end of billing period
 */
export const cancelSubscription = async (): Promise<{ success: boolean }> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<{ success: boolean }>(apiRoutes.billing.cancel, {});
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 500);
  });
};
