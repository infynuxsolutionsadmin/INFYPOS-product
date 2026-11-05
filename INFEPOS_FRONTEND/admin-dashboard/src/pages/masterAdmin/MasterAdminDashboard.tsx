import React, { useEffect, useState } from 'react';
import { getTenants, createTenant, updateTenant } from '../../api/tenants.api';
import type { Tenant } from '../../api/tenants.api';
import {
  getSubscriptionPlans,
  updatePlanConfig,
  type SubscriptionPlanTier,
} from '../../api/billing.api';
import TenantFormModal from '../../components/tenants/TenantFormModal';
import EditTenantModal from '../../components/tenants/EditTenantModal';
import {
  CreditCard,
  Building,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';

const MasterAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans'>('tenants');

  // Tenants state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlanTier[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanTier | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string | null>(null);

  // Plan Edit Form state
  const [formName, setFormName] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState(0);
  const [formAnnualPrice, setFormAnnualPrice] = useState(0);
  const [formMaxStores, setFormMaxStores] = useState(1);
  const [isUnlimitedStores, setIsUnlimitedStores] = useState(false);
  const [formMaxUsers, setFormMaxUsers] = useState(2);
  const [isUnlimitedUsers, setIsUnlimitedUsers] = useState(false);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await getTenants();
      const items = data?.items || (Array.isArray(data) ? data : []);
      setTenants(items);
    } catch (err) {
      console.error('Failed to load tenants', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await getSubscriptionPlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const handleCreateTenant = async (data: any) => {
    await createTenant(data);
    await fetchTenants();
  };

  const handleUpdateTenant = async (id: string, data: any) => {
    await updateTenant(id, data);
    await fetchTenants();
  };

  const openEditPlan = (plan: SubscriptionPlanTier) => {
    setSelectedPlan(plan);
    setFormName(plan.name);
    setFormBadge(plan.badge || '');
    setFormMonthlyPrice(plan.monthlyPriceGbp);
    setFormAnnualPrice(plan.annualPriceGbp);
    setIsUnlimitedStores(plan.maxStores === -1 || plan.maxStores >= 999);
    setFormMaxStores(plan.maxStores === -1 || plan.maxStores >= 999 ? 1 : plan.maxStores);
    setIsUnlimitedUsers(plan.maxUsers === -1 || plan.maxUsers >= 999);
    setFormMaxUsers(plan.maxUsers === -1 || plan.maxUsers >= 999 ? 2 : plan.maxUsers);
    setFormFeatures([...(plan.features || [])]);
    setIsPlanModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormFeatures([...formFeatures, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== index));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setPlanSaving(true);
      await updatePlanConfig(selectedPlan.code, {
        name: formName,
        badge: formBadge.trim() ? formBadge.trim() : null,
        monthlyPriceGbp: Number(formMonthlyPrice),
        annualPriceGbp: Number(formAnnualPrice),
        maxStores: isUnlimitedStores ? -1 : Number(formMaxStores),
        maxUsers: isUnlimitedUsers ? -1 : Number(formMaxUsers),
        features: formFeatures,
      });

      setPlanSuccessMsg(`Plan ${selectedPlan.name} updated successfully!`);
      setIsPlanModalOpen(false);
      await fetchPlans();
      setTimeout(() => setPlanSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update plan configuration');
    } finally {
      setPlanSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      {/* Top Header & Tab Navigation */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Master System Administration
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Control registered tenant companies, subscription tiers, pricing, and platform limits.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 md:mt-0 flex items-center bg-gray-200/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tenants'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Tenants ({tenants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'plans'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Subscription Plans & Pricing ({plans.length})</span>
          </button>
        </div>
      </div>

      {planSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p>{planSuccessMsg}</p>
        </div>
      )}

      {/* TAB 1: TENANTS */}
      {activeTab === 'tenants' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsModalOpen(true)}
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-2xl shadow-sm text-sm font-medium text-white bg-[#5B58F2] hover:bg-[#4A47E5] transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create New Tenant</span>
            </button>
          </div>

          <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden">
            {loading && tenants.length === 0 ? (
              <div className="p-10 text-center text-gray-500">Loading tenants...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined Date
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tenant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {tenant.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {tenant.subscriptionPlan || 'STARTER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsEditModalOpen(true);
                          }}
                          className="text-[#5B58F2] hover:text-blue-900 transition-colors font-bold"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        No tenants found. Click "Create New Tenant" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION PLANS & PRICING */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Configurable Subscription Tiers</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Edit monthly/annual prices in GBP (£), store and user limits, and features. Any update takes effect across the platform instantly.
              </p>
            </div>
          </div>

          {plansLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading plan tiers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                          {plan.code}
                        </span>
                        <h4 className="text-lg font-bold text-gray-900 mt-1">{plan.name}</h4>
                      </div>
                      {plan.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-gray-900">£{plan.monthlyPriceGbp}</span>
                        <span className="text-xs text-gray-500 font-medium">/ month</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Annual rate: <strong>£{plan.annualPriceGbp}/mo</strong> (billed annually)
                      </p>
                    </div>

                    {/* Hard Limits */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <span className="text-gray-500 block text-[11px]">Max Stores</span>
                        <span className="font-bold text-indigo-900 text-sm">
                          {plan.maxStores === -1 || plan.maxStores >= 999 ? 'Unlimited' : `${plan.maxStores} Store(s)`}
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <span className="text-gray-500 block text-[11px]">Max Cashiers/Users</span>
                        <span className="font-bold text-indigo-900 text-sm">
                          {plan.maxUsers === -1 || plan.maxUsers >= 999 ? 'Unlimited' : `${plan.maxUsers} Users`}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div>
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Features & Inclusions
                      </h5>
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 mt-6">
                    <button
                      onClick={() => openEditPlan(plan)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Plan & Limits</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLAN EDIT MODAL */}
      {isPlanModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#F9FAFC] border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Edit Plan: {selectedPlan.name} ({selectedPlan.code})
                </h3>
                <p className="text-xs text-gray-500">
                  Update pricing, store/user quotas, and listed features
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Badge (Optional)</label>
                  <input
                    type="text"
                    value={formBadge}
                    placeholder="e.g. Most Popular, Enterprise"
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pricing in GBP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Monthly Price (£ GBP)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formMonthlyPrice}
                    onChange={(e) => setFormMonthlyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Annual Rate (£ GBP / month)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formAnnualPrice}
                    onChange={(e) => setFormAnnualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hard Quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Max Stores</label>
                    <label className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUnlimitedStores}
                        onChange={(e) => setIsUnlimitedStores(e.target.checked)}
                      />
                      <span>Unlimited</span>
                    </label>
                  </div>
                  {!isUnlimitedStores && (
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMaxStores}
                      onChange={(e) => setFormMaxStores(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Max Users / Cashiers</label>
                    <label className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUnlimitedUsers}
                        onChange={(e) => setIsUnlimitedUsers(e.target.checked)}
                      />
                      <span>Unlimited</span>
                    </label>
                  </div>
                  {!isUnlimitedUsers && (
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMaxUsers}
                      onChange={(e) => setFormMaxUsers(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Features List */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 mb-2">Feature Bullet Points</label>
                <div className="space-y-2 mb-3">
                  {formFeatures.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl text-xs">
                      <span className="flex-1 text-gray-800">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="Add a new feature bullet point..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="px-5 py-2 rounded-xl bg-[#5B58F2] hover:bg-[#4A47E5] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {planSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Plan Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TenantFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTenant}
      />

      <EditTenantModal
        isOpen={isEditModalOpen}
        tenant={selectedTenant}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTenant(null);
        }}
        onSubmit={handleUpdateTenant}
      />
    </div>
  );
};

export default MasterAdminDashboard;
