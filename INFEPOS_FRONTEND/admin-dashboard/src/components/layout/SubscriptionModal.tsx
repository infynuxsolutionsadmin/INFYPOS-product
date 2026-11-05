import React, { useEffect, useState } from 'react';
import {
  X,
  CreditCard,
  ExternalLink,
  Receipt,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  type BillingStatusResponse,
  getBillingStatus,
  createCustomerPortalSession,
  createCheckoutSession,
} from '../../api/billing.api';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlanOption {
  id: 'STARTER' | 'PRO' | 'ENTERPRISE';
  name: string;
  monthlyGbp: number;
  annualGbp: number;
  badge?: string;
  features: string[];
}

const AVAILABLE_PLANS: PlanOption[] = [
  {
    id: 'STARTER',
    name: 'Starter Retail',
    monthlyGbp: 39,
    annualGbp: 31,
    features: [
      '1 Store Location',
      'Up to 2 POS Registers',
      'Real-time SQLite Offline Sync',
      'Core Inventory & Barcodes',
      'Cashier Shifts & Z-Reports',
    ],
  },
  {
    id: 'PRO',
    name: 'Professional Retail',
    monthlyGbp: 79,
    annualGbp: 63,
    badge: 'Most Popular',
    features: [
      'Multi-Store Management',
      'Unlimited POS Cashier Terminals',
      'Advanced Inventory & Stock Transfers',
      'Loyalty, Discounts & Gift Cards',
      'Stripe Integrated Payments',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise Multi-Chain',
    monthlyGbp: 149,
    annualGbp: 119,
    features: [
      'Unlimited Store Locations',
      'Central Warehouse Management',
      'Dedicated Database Instance',
      'Priority 24/7 Phone & SLA Support',
      'Custom ERP & Accounting Webhooks',
    ],
  },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    getBillingStatus()
      .then((data) => {
        setBilling(data);
        if (data.billingCycle) {
          setBillingCycle(data.billingCycle);
        }
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || err.message || 'Failed to load subscription details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenStripePortal = async () => {
    try {
      setPortalLoading(true);
      const res = await createCustomerPortalSession(window.location.href);
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to open Stripe billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSwitchPlan = async (planId: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    try {
      setCheckoutLoading(planId);
      const res = await createCheckoutSession({
        plan: planId,
        billingCycle,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to initiate plan checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlanId = billing?.subscriptionPlan || 'PRO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#F9FAFC] border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Subscription & Billing
              </h2>
              <p className="text-xs text-gray-500">
                Manage your INFEPOS plan, Stripe payment method, and billing invoices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-medium text-gray-500">Fetching live subscription status...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Hero Banner: Current Plan */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                        Current Plan
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          billing?.subscriptionStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {billing?.subscriptionStatus || 'TRIALING'}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black tracking-tight text-white">
                      {billing?.pricing?.name || 'Professional'} Retail Plan
                    </h3>
                    <p className="text-xs text-indigo-200/80 mt-1">
                      Billed {billing?.billingCycle || 'MONTHLY'} • £
                      {((billing?.pricing?.monthlyAmountGbp || 7900) / 100).toFixed(2)} / mo
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleOpenStripePortal}
                      disabled={portalLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 font-bold text-xs hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all shadow-md shadow-black/20 disabled:opacity-50 cursor-pointer"
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Manage in Stripe Portal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-indigo-300 block mb-1">Billing Cycle</span>
                    <span className="font-semibold text-white">
                      {billing?.billingCycle || 'Monthly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300 block mb-1">Next Renewal</span>
                    <span className="font-semibold text-white">
                      {billing?.currentPeriodEnd
                        ? new Date(billing.currentPeriodEnd).toLocaleDateString()
                        : 'Auto-renew active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300 block mb-1">Payment Method</span>
                    <span className="font-semibold text-white">
                      {billing?.stripeCustomerId ? 'Stripe Secure Card' : 'Pending Verification'}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300 block mb-1">Invoices</span>
                    <span className="font-semibold text-white">
                      {billing?.invoices?.length || 0} Generated
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Options & Switcher */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      Available Subscription Tiers
                    </h4>
                    <p className="text-xs text-gray-500">
                      Switch or upgrade your plan at any time. Prorated balance is automatically credited.
                    </p>
                  </div>

                  {/* Billing Cycle Switch */}
                  <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-semibold self-start sm:self-auto">
                    <button
                      onClick={() => setBillingCycle('MONTHLY')}
                      className={`px-3 py-1 rounded-full transition-all ${
                        billingCycle === 'MONTHLY'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('ANNUAL')}
                      className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                        billingCycle === 'ANNUAL'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <span>Annual</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        Save 20%
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {AVAILABLE_PLANS.map((plan) => {
                    const isCurrent = currentPlanId === plan.id;
                    const price = billingCycle === 'ANNUAL' ? plan.annualGbp : plan.monthlyGbp;

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                            : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-gray-900 text-sm">{plan.name}</h5>
                            {plan.badge && (
                              <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                {plan.badge}
                              </span>
                            )}
                          </div>

                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-gray-900">£{price}</span>
                              <span className="text-xs text-gray-500 font-medium">/ month</span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {billingCycle === 'ANNUAL' ? 'Billed annually' : 'Billed monthly'}
                            </span>
                          </div>

                          <ul className="space-y-2 mb-6">
                            {plan.features.map((feat, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          {isCurrent ? (
                            <button
                              disabled
                              className="w-full py-2 px-3 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs cursor-default text-center"
                            >
                              Current Active Plan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSwitchPlan(plan.id)}
                              disabled={checkoutLoading !== null}
                              className="w-full py-2 px-3 rounded-xl bg-gray-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {checkoutLoading === plan.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <span>Switch to {plan.name.split(' ')[0]}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoices list */}
              {billing?.invoices && billing.invoices.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    <span>Recent Invoices</span>
                  </h4>
                  <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-xs">
                    <table className="min-w-full divide-y divide-gray-100 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase">
                            Receipt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {billing.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                              {inv.stripeInvoiceId}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {inv.paidAt
                                ? new Date(inv.paidAt).toLocaleDateString()
                                : new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              £{(inv.amountPaid / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {inv.invoicePdf || inv.hostedInvoiceUrl ? (
                                <a
                                  href={inv.invoicePdf || inv.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                  <span>PDF</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
