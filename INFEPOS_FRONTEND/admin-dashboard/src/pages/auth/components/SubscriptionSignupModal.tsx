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
  Store,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_25px_70px_rgba(15,23,42,0.28)] border border-slate-100 w-full max-w-4xl lg:max-w-5xl flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#071E40] via-[#0A2D60] to-[#0D3B7D] px-5 sm:px-7 py-4 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <Store className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">INFEPOS Merchant Subscription</h2>
              <p className="text-[11px] sm:text-xs text-blue-200/80">Activate your store credentials &amp; start selling in minutes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-50/90 px-5 sm:px-7 py-2.5 border-b border-slate-200/70 flex items-center justify-between text-xs font-semibold shrink-0">
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
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
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

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT PLAN */}
          {step === 1 && (
            <div>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center mb-5">
                <div className="bg-slate-100 p-1 rounded-full border border-slate-200/80 flex items-center gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      billingCycle === 'ANNUAL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[9.5px] bg-emerald-400 text-slate-900 px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const price = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative rounded-2xl p-4 sm:p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-gradient-to-b from-blue-50/40 to-white shadow-md ring-2 ring-blue-600/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 min-h-[28px]">{plan.description}</p>

                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">${price}</span>
                          <span className="text-xs text-slate-500 font-medium">/ month</span>
                        </div>
                        {billingCycle === 'ANNUAL' && (
                          <p className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">Billed annually (${price * 12}/yr)</p>
                        )}

                        <div className="mt-4 space-y-2 pt-3.5 border-t border-slate-100">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-1">
                        <button
                          type="button"
                          className={`w-full py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Plan Selected' : 'Choose Plan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: STORE & OWNER DETAILS */}
          {step === 2 && (
            <div className="space-y-3.5 max-w-2xl mx-auto py-1">
              <div className="text-center mb-3">
                <h3 className="text-lg font-bold text-slate-900">Store &amp; Account Details</h3>
                <p className="text-xs text-slate-500">Create your retail tenant code and master owner login credentials.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business / Store Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="e.g. Apex Supermarket"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tenant Code <span className="text-slate-400 font-normal">(For POS Pairing)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    placeholder="e.g. APEX_RETAIL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-blue-600 uppercase focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Owner First Name</label>
                  <input
                    type="text"
                    required
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Owner Last Name</label>
                  <input
                    type="text"
                    required
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email (Admin Login)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@yourstore.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT & CHECKOUT */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto py-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left: Payment Method Simulator */}
                <div className="md:col-span-7 space-y-3.5">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Expiration</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>256-bit SSL encrypted. Subscription activates immediately upon verification.</span>
                  </div>
                </div>

                {/* Right: Order Summary */}
                <div className="md:col-span-5 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Order Summary</h4>
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

                    <div className="border-t border-slate-200 mt-3 pt-2.5 flex justify-between items-baseline">
                      <span className="font-bold text-xs text-slate-900">Total Billed Today</span>
                      <span className="font-extrabold text-xl text-blue-600">
                        ${billingCycle === 'ANNUAL' ? activePrice * 12 : activePrice}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleCheckoutAndRegister}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Pay &amp; Generate Credentials</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INSTANT CREDENTIAL HANDOVER */}
          {step === 4 && createdCredentials && (
            <div className="text-center py-2 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 ring-6 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Payment Confirmed &amp; Account Active!</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Here are your credentials to log into the Cloud Admin and connect your POS terminal registers.
              </p>

              {/* Credential Card */}
              <div className="mt-5 bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 text-left space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Tenant Code</p>
                    <p className="text-base font-mono font-bold text-white mt-0.5">{createdCredentials.tenantCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.tenantCode, 'code')}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'code' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Login Email</p>
                    <p className="text-xs font-medium text-slate-200 mt-0.5">{createdCredentials.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdCredentials.email, 'email')}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Subscription Plan</p>
                    <p className="text-xs font-semibold text-emerald-400 mt-0.5">{createdCredentials.plan} (Active)</p>
                  </div>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href="/downloads/INFEPOS_Terminal_Setup.exe"
                  download
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download POS App (.exe)</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>Go to Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Fixed Footer Bar for Steps 1-3 */}
        {step < 4 && (
          <div className="bg-slate-50 px-5 sm:px-7 py-3 border-t border-slate-200/70 flex items-center justify-between shrink-0">
            {step === 1 && (
              <>
                <div className="text-xs text-slate-600 font-medium">
                  Selected: <strong className="text-slate-900 font-bold">{currentPlanObj.name}</strong> (${activePrice}/mo)
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue to Store Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-600 hover:text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  ← Back to Plans
                </button>
                <button
                  type="button"
                  disabled={!storeName || !tenantCode || !ownerFirstName || !email || !password}
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Proceed to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-slate-600 hover:text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  ← Back to Store Info
                </button>
                <div className="text-xs text-slate-500 font-medium hidden sm:block">
                  Billed: <strong className="text-slate-900 font-bold">${billingCycle === 'ANNUAL' ? activePrice * 12 : activePrice}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSignupModal;
