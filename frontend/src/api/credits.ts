/**
 * Credits API
 * Handles credit balance, history, and purchases
 */

import { apiGet, apiPost } from './client';
import { apiRoutes } from '@/config/apiRoutes';

export interface CreditsBalance {
  current_balance: number;
  monthly_allocation: number;
  month_used: number;
  month_remaining: number;
  plan: string;
  expires_soon: Array<{
    amount: number;
    expires_at: string;
  }>;
}

export interface CreditTransaction {
  id: number;
  timestamp: string;
  type: 'monthly_allocation' | 'purchase' | 'usage' | 'expiration' | 'refund' | 'bonus';
  amount: number;
  description: string;
  balance_after: number;
  expires_at?: string;
}

export interface CreditsHistory {
  transactions: CreditTransaction[];
  total: number;
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  bonus?: number;
}

/**
 * Get current credits balance
 * GET /credits/balance
 */
export const getCreditsBalance = async (): Promise<CreditsBalance> => {
  return apiGet<CreditsBalance>('/credits/balance');
};

/**
 * Get credit transaction history
 * GET /credits/history?limit=50&offset=0
 */
export const getCreditsHistory = async (limit: number = 50, offset: number = 0): Promise<CreditsHistory> => {
  return apiGet<CreditsHistory>(`/credits/history?limit=${limit}&offset=${offset}`);
};

/**
 * Create Stripe Checkout session for credit purchase
 * POST /credits/checkout
 */
export const purchaseCredits = async (packageId: string): Promise<{ checkout_url: string }> => {
  return apiPost<{ checkout_url: string }>('/credits/checkout', { package_id: packageId });
};

/**
 * Credit packages available for purchase
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'credits_100', credits: 100, price: 99 },
  { id: 'credits_500', credits: 500, price: 399 },
  { id: 'credits_2000', credits: 2000, price: 1299 },
  { id: 'credits_10000', credits: 10000, price: 4990, bonus: 15 },
  { id: 'credits_50000', credits: 50000, price: 0 }, // Requires quote
];

