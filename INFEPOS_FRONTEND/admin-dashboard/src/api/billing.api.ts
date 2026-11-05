import client from './client';

export interface CheckoutSessionRequest {
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface BillingInvoice {
  id: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  paidAt?: string;
  createdAt: string;
}

export interface SubscriptionPlanTier {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  badge?: string | null;
  monthlyPriceGbp: number;
  annualPriceGbp: number;
  maxStores: number;
  maxUsers: number;
  features: string[];
}

export interface BillingStatusResponse {
  tenantId: string;
  tenantCode: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionPlan: 'STARTER' | 'PRO' | 'ENTERPRISE' | 'FREE_TRIAL';
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pricing: {
    id: string;
    name: string;
    monthlyAmountGbp: number;
    annualAmountGbp: number;
    maxStores?: number;
    maxUsers?: number;
    features?: string[];
  };
  invoices: BillingInvoice[];
  stripeEnabled: boolean;
}

/**
 * Create a Stripe checkout session for plan upgrade or renewal
 */
export const createCheckoutSession = async (
  payload: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> => {
  const response = await client.post<any>('/billing/checkout', payload);
  return response.data?.data || response.data;
};

/**
 * Create a Stripe Customer Billing Portal session for card update, invoice download, or cancellation
 */
export const createCustomerPortalSession = async (
  returnUrl?: string,
): Promise<{ url: string }> => {
  const response = await client.post<any>('/billing/portal', { returnUrl });
  return response.data?.data || response.data;
};

/**
 * Retrieve current tenant subscription status, active plan, and recent invoices
 */
export const getBillingStatus = async (): Promise<BillingStatusResponse> => {
  const response = await client.get<any>('/billing/status');
  return response.data?.data || response.data;
};

/**
 * Retrieve all active subscription plan tiers
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlanTier[]> => {
  const response = await client.get<any>('/billing/plans');
  return response.data?.data || response.data;
};

/**
 * Select active stores on plan downgrade (freezes unselected stores)
 */
export const selectActiveStores = async (
  plan: string,
  activeStoreIds: string[],
): Promise<{ success: boolean; plan: string; activeCount: number; frozenCount: number; frozenStoreIds: string[] }> => {
  const response = await client.post<any>('/billing/select-active-stores', {
    plan,
    activeStoreIds,
  });
  return response.data?.data || response.data;
};

/**
 * Master Admin: update plan tier configuration
 */
export const updatePlanConfig = async (
  code: string,
  payload: Partial<SubscriptionPlanTier>,
): Promise<SubscriptionPlanTier> => {
  const response = await client.patch<any>(`/billing/master/plans/${code}`, payload);
  return response.data?.data || response.data;
};
