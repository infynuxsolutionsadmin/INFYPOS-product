import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Store, Tag, Save, RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getStores } from '../../api/stores.api';
import { getVatSettings, getStoreSettings, updateStoreSettings } from '../../api/settings.api';
import type { Store as StoreType } from '../../types/stores';
import type { VatRate, UpdateStoreSettingsPayload } from '../../types/settings';

// ─── helpers ────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden mb-6 transition-all">
    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-slate-50/30">
      <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-[#1a1f36]">{title}</h2>
    </div>
    <div className="p-6 sm:p-8">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="mb-2">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
  </div>
);

const textInput = (value: string, onChange: (v: string) => void, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
    {...props}
  />
);

// ─── main page ───────────────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canReadSettings = hasPermission('settings.read');
  const canReadStores = hasPermission('stores.read');
  const canUpdateStores = hasPermission('stores.update');

  // Store selector
  const [stores, setStores] = useState<StoreType[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Store config state
  const [storeData, setStoreData] = useState<StoreType | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSaveSuccess, setStoreSaveSuccess] = useState(false);
  const [storeSaveError, setStoreSaveError] = useState<string | null>(null);

  // Form fields (UpdateStoreDto fields only)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');

  // VAT rates
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [vatLoading, setVatLoading] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);

  // Load stores
  useEffect(() => {
    if (!canReadStores) return;
    setStoresLoading(true);
    getStores({ limit: 100 })
      .then(r => {
        setStores(r.items);
        if (r.items.length > 0) {
          // Prefer the default store
          const def = r.items.find(s => s.isDefault) || r.items[0];
          setSelectedStoreId(def.id);
        }
      })
      .catch(() => {})
      .finally(() => setStoresLoading(false));
  }, [canReadStores]);

  // Load VAT settings
  useEffect(() => {
    if (!canReadSettings) return;
    setVatLoading(true);
    getVatSettings()
      .then(setVatRates)
      .catch(err => setVatError(err.response?.data?.message || err.message || 'Failed to load VAT settings'))
      .finally(() => setVatLoading(false));
  }, [canReadSettings]);

  // Load store when selectedStoreId changes
  const loadStore = useCallback(async () => {
    if (!selectedStoreId || !canReadStores) return;
    setStoreLoading(true);
    setStoreError(null);
    setStoreSaveSuccess(false);
    setStoreSaveError(null);
    try {
      const data = await getStoreSettings(selectedStoreId);
      setStoreData(data);
      // Populate form fields
      setName(data.name || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setAddressLine1(data.addressLine1 || '');
      setAddressLine2(data.addressLine2 || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPostalCode(data.postalCode || '');
      setCountry(data.country || '');
      setTimezone(data.timezone || '');
      setCurrency(data.currency || '');
    } catch (err: any) {
      setStoreError(err.response?.data?.message || err.message || 'Failed to load store settings');
    } finally {
      setStoreLoading(false);
    }
  }, [selectedStoreId, canReadStores]);

  useEffect(() => { loadStore(); }, [loadStore]);

  const handleStoreSave = async () => {
    if (!selectedStoreId || !canUpdateStores) return;
    setStoreSaving(true);
    setStoreSaveSuccess(false);
    setStoreSaveError(null);

    const payload: UpdateStoreSettingsPayload = {};
    if (name !== (storeData?.name || '')) payload.name = name;
    if (phone !== (storeData?.phone || '')) payload.phone = phone || undefined;
    if (email !== (storeData?.email || '')) payload.email = email || undefined;
    if (addressLine1 !== (storeData?.addressLine1 || '')) payload.addressLine1 = addressLine1 || undefined;
    if (addressLine2 !== (storeData?.addressLine2 || '')) payload.addressLine2 = addressLine2 || undefined;
    if (city !== (storeData?.city || '')) payload.city = city || undefined;
    if (state !== (storeData?.state || '')) payload.state = state || undefined;
    if (postalCode !== (storeData?.postalCode || '')) payload.postalCode = postalCode || undefined;
    if (country !== (storeData?.country || '')) payload.country = country || undefined;
    if (timezone !== (storeData?.timezone || '')) payload.timezone = timezone || undefined;
    if (currency !== (storeData?.currency || '')) payload.currency = currency || undefined;

    if (Object.keys(payload).length === 0) {
      setStoreSaveSuccess(true);
      setStoreSaving(false);
      return;
    }

    try {
      const updated = await updateStoreSettings(selectedStoreId, payload);
      setStoreData(updated);
      setStoreSaveSuccess(true);
      setTimeout(() => setStoreSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save settings';
      setStoreSaveError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setStoreSaving(false);
    }
  };

  const handleStoreReset = () => {
    if (!storeData) return;
    setName(storeData.name || '');
    setPhone(storeData.phone || '');
    setEmail(storeData.email || '');
    setAddressLine1(storeData.addressLine1 || '');
    setAddressLine2(storeData.addressLine2 || '');
    setCity(storeData.city || '');
    setState(storeData.state || '');
    setPostalCode(storeData.postalCode || '');
    setCountry(storeData.country || '');
    setTimezone(storeData.timezone || '');
    setCurrency(storeData.currency || '');
    setStoreSaveError(null);
    setStoreSaveSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage available system and business settings.</p>
        </div>
      </div>

      {/* VAT Settings — read-only reference data */}
      {canReadSettings && (
        <Section title="VAT Rates" icon={<Tag className="h-4 w-4" />}>
          {vatLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5B58F2]"></div>
            </div>
          ) : vatError ? (
            <div className="text-red-500 text-sm">{vatError}</div>
          ) : vatRates.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No VAT rates configured.</p>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                These VAT rates are defined by the system and are read-only. Contact your system administrator to modify them.
              </p>
              <div className="overflow-hidden border border-gray-100 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-[#f8f9fc]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {vatRates.map(v => (
                      <tr key={v.code} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-semibold text-[#5B58F2]">{v.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{v.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{v.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Store Configuration */}
      {canReadStores && (
        <Section title="Store Configuration" icon={<Store className="h-4 w-4" />}>
          {/* Store selector */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Store</label>
            {storesLoading ? (
              <div className="h-9 bg-gray-100 rounded-2xl animate-pulse w-64" />
            ) : stores.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No stores found.</p>
            ) : (
              <div className="relative w-64">
                <select
                  value={selectedStoreId}
                  onChange={e => setSelectedStoreId(e.target.value)}
                  className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {storeLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#5B58F2]"></div>
            </div>
          ) : storeError ? (
            <div className="text-red-500 text-sm">{storeError}</div>
          ) : !storeData ? null : (
            <>
              {/* Read-only info */}
              <div className="mb-8 bg-blue-50/50 border border-blue-100/50 rounded-[24px] px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">Store Code</p>
                  <p className="font-mono font-bold text-blue-900 bg-blue-100/50 inline-block px-2 py-1 rounded-lg">{storeData.code}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">Status</p>
                  <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${storeData.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {storeData.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">Default Store</p>
                  <p className="font-bold text-blue-900">{storeData.isDefault ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-6 -mt-4 ml-2">Store code, status, and default flag are managed in the Stores module.</p>

              {/* Editable fields */}
              {canUpdateStores ? (
                <div className="space-y-5">
                  {storeSaveError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {storeSaveError}
                    </div>
                  )}
                  {storeSaveSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                      Store settings saved successfully.
                    </div>
                  )}

                  {/* Identity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Store Name *">
                      {textInput(name, setName, { maxLength: 255, required: true, placeholder: 'Store name' })}
                    </Field>
                    <Field label="Email">
                      <input
                        type="email" value={email} maxLength={255}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="store@example.com"
                        className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                      />
                    </Field>
                    <Field label="Phone">
                      {textInput(phone, setPhone, { maxLength: 50, placeholder: '+1 555 000 0000' })}
                    </Field>
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Address Line 1" hint="Street address">
                      {textInput(addressLine1, setAddressLine1, { maxLength: 255 })}
                    </Field>
                    <Field label="Address Line 2">
                      {textInput(addressLine2, setAddressLine2, { maxLength: 255 })}
                    </Field>
                    <Field label="City">
                      {textInput(city, setCity, { maxLength: 100 })}
                    </Field>
                    <Field label="State / Province">
                      {textInput(state, setState, { maxLength: 100 })}
                    </Field>
                    <Field label="Postal Code">
                      {textInput(postalCode, setPostalCode, { maxLength: 50 })}
                    </Field>
                    <Field label="Country">
                      {textInput(country, setCountry, { maxLength: 100 })}
                    </Field>
                  </div>

                  {/* Regional */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Timezone" hint="e.g. UTC, Europe/London, Asia/Kolkata">
                      {textInput(timezone, setTimezone, { maxLength: 50, placeholder: 'UTC' })}
                    </Field>
                    <Field label="Currency" hint="ISO 4217 code e.g. USD, GBP, EUR, INR">
                      {textInput(currency, setCurrency, { maxLength: 10, placeholder: 'USD' })}
                    </Field>
                  </div>

                  {/* Save bar */}
                  <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100">
                    <button
                      onClick={handleStoreSave}
                      disabled={storeSaving || !name.trim()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-full hover:from-indigo-600 hover:to-purple-700 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Save className="h-4 w-4" />
                      {storeSaving ? 'Saving...' : 'Save Store Settings'}
                    </button>
                    <button
                      onClick={handleStoreReset}
                      disabled={storeSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-50 hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                /* Read-only view for users without stores.update */
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-gray-400 italic">You have read-only access to store settings.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/50 border border-gray-200 rounded-3xl p-4">
                    {[
                      ['Name', storeData.name],
                      ['Email', storeData.email],
                      ['Phone', storeData.phone],
                      ['Address', storeData.addressLine1],
                      ['City', storeData.city],
                      ['Country', storeData.country],
                      ['Timezone', storeData.timezone],
                      ['Currency', storeData.currency],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700">{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {/* No accessible settings */}
      {!canReadSettings && !canReadStores && (
        <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center shadow-sm">
          <Settings className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">You do not have permission to view settings.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
