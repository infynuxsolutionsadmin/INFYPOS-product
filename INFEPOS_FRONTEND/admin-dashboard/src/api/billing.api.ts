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

