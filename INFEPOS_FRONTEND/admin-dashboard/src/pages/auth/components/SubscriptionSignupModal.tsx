import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Copy,
  CheckCircle2,
  Download,
  ArrowRight,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { registerTenant } from '../../../api/auth.api';
import { useAuthStore } from '../../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface SubscriptionSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlanDetails {
  id: string;
  name: string;
  badge?: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
}

const PLANS: PlanDetails[] = [
  {
    id: 'STARTER',
    name: 'Starter Retail',
    monthlyPrice: 39,
    annualPrice: 31,
    description: 'Perfect for single stores and boutique shops.',
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
    name: 'Professional',
    badge: 'Most Popular',
    monthlyPrice: 79,
    annualPrice: 63,
    description: 'For growing retail businesses with multi-tills.',
    features: [
      'Up to 5 Store Outlets',
      'Unlimited POS Registers',
      'Inter-Store Stock Transfers',
      'Supplier & Goods Receipt Orders',
      'Automated Audit Trail & Logs',
      'Priority Email & Cloud Backups',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    badge: 'Scale',
    monthlyPrice: 149,
    annualPrice: 119,
    description: 'Full ERP capabilities for multi-chain brands.',
    features: [
      'Unlimited Stores & Warehouses',
      'Unlimited Registers & Terminals',
      'Custom ERP & API Webhooks',
      'Dedicated Account Manager',
      '24/7 Priority Support SLA',
      'Custom Domain White-labeling',
    ],
  },
];

export const SubscriptionSignupModal: React.FC<SubscriptionSignupModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<string>('PRO');

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Payment mock state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    tenantCode: string;
    email: string;
    storeName: string;
    plan: string;
  } | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Auto generate clean tenant code from store name
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    const suggestedCode = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 24);
    setTenantCode(suggestedCode);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckoutAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await registerTenant({
        storeName: storeName.trim(),
        tenantCode: tenantCode.trim().toUpperCase(),
        ownerFirstName: ownerFirstName.trim(),
        ownerLastName: ownerLastName.trim(),
        email: email.trim(),
        password,
        plan: selectedPlan,
        billingCycle,
        paymentReference: `PAY_MOCK_${Date.now()}`,
      });

      // Save credentials for the success screen
      setCreatedCredentials({
        tenantCode: response.tenant.code,
        email: response.user.email,
        storeName: response.tenant.name,
        plan: selectedPlan,
      });

      // Update auth store so they are logged in
      setAuth(
        response.user,
        response.permissions || ['dashboard.read', 'pos.sell'],
        response.tokens.accessToken,
        response.tokens.refreshToken
      );

      setStep(4); // Move to Success & Credential Handover
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentPlanObj = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];
  const activePrice = billingCycle === 'MONTHLY' ? currentPlanObj.monthlyPrice : currentPlanObj.annualPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 bg-white rounded-[32px] shadow-[0_25px_70px_rgba(15,23,42,0.25)] border border-slate-100 w-full max-w-3xl overflow-hidden animate-fadeIn">
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 sm:px-8 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">INFEPOS Merchant Subscription</h2>
              <p className="text-xs text-blue-200/80">Activate store credentials & start selling in minutes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-50 px-6 sm:px-8 py-3.5 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: '1. Select Plan' },
            { num: 2, label: '2. Store & Owner' },
            { num: 3, label: '3. Payment' },
            { num: 4, label: '4. Credentials' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 transition-colors ${
                step === s.num
                  ? 'text-blue-600 font-bold'
                  : step > s.num
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s.num ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT PLAN */}
          {step === 1 && (
            <div>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-slate-100 p-1 rounded-full border border-slate-200 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      billingCycle === 'MONTHLY'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('ANNUAL')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      billingCycle === 'ANNUAL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] bg-emerald-400 text-slate-900 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const price = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-600/10'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-3 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-slate-900">${price}</span>
                          <span className="text-xs text-slate-500 font-medium">/ month</span>
                        </div>
                        {billingCycle === 'ANNUAL' && (
                          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Billed annually (${price * 12}/yr)</p>
                        )}

                        <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-2">
                        <div
                          className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Plan Selected' : 'Choose Plan'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <span>Continue to Store Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STORE & OWNER DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Business / Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="e.g. Apex Supermarket"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tenant Code <span className="text-slate-400 font-normal">(Used to login & pair POS)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    placeholder="e.g. APEX_RETAIL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-blue-600 uppercase focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner First Name</label>
                  <input
                    type="text"
                    required
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Last Name</label>
                  <input
                    type="text"
                    required
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Email (Login Email)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@yourstore.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-600 hover:text-slate-900 font-medium text-xs px-4 py-2"
                >
                  Back to Plans
                </button>
                <button
                  type="button"
                  disabled={!storeName || !tenantCode || !ownerFirstName || !email || !password}
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <span>Proceed to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT & CHECKOUT */}
          {step === 3 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: Payment Method Simulator */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Payment Information (Sandbox Simulator)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Expiration</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>256-bit SSL encrypted. Subscription activates immediately upon verification.</span>
                  </div>
                </div>

                {/* Right: Order Summary */}
                <div className="md:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Order Summary</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-semibold">{currentPlanObj.name}</span>
                        <span>${activePrice} / mo</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Cycle</span>
                        <span>{billingCycle}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Terminal Setup</span>
                        <span className="text-emerald-600 font-bold">FREE</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 mt-4 pt-3 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-slate-900">Total Billed Today</span>
                      <span className="font-extrabold text-2xl text-blue-600">
                        ${billingCycle === 'ANNUAL' ? activePrice * 12 : activePrice}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleCheckoutAndRegister}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Pay & Generate Credentials</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 py-1"
                    >
                      Back to Store Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INSTANT CREDENTIAL HANDOVER */}
          {step === 4 && createdCredentials && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900">Payment Confirmed & Account Active!</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Here are your official credentials to log into the Cloud Admin and connect your POS terminal registers.
              </p>

              {/* Credential Card */}
              <div className="mt-6 max-w-lg mx-auto bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tenant Code</p>
                    <p className="text-lg font-mono font-bold text-white mt-0.5">{createdCredentials.tenantCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.tenantCode, 'code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'code' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Login Email</p>
                    <p className="text-sm font-medium text-slate-200 mt-0.5">{createdCredentials.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.email, 'email')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Subscription Plan</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-0.5">{createdCredentials.plan} (Active)</p>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                    Active
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/downloads/INFEPOS_Terminal_Setup.exe"
                  download
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download POS Software (.exe)</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 transition-all"
                >
                  <span>Go to Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSignupModal;
