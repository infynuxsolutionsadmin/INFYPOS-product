import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Store, CreateStoreRequest, UpdateStoreRequest, StoreStatus } from '../../types/stores';
import { createStore, updateStore } from '../../api/stores.api';

interface StoreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  store?: Store | null;
}

const StoreFormModal: React.FC<StoreFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  store,
}) => {
  const isEditing = !!store;
  
  const [formData, setFormData] = useState<CreateStoreRequest & { status?: StoreStatus }>({
    name: '',
    code: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    timezone: 'UTC',
    currency: 'USD',
    status: 'ACTIVE',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        code: store.code,
        phone: store.phone || '',
        email: store.email || '',
        addressLine1: store.addressLine1 || '',
        addressLine2: store.addressLine2 || '',
        city: store.city || '',
        state: store.state || '',
        postalCode: store.postalCode || '',
        country: store.country || '',
        timezone: store.timezone || 'UTC',
        currency: store.currency || 'USD',
        status: store.status,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        timezone: 'UTC',
        currency: 'USD',
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [store, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = { ...formData };
      
      // Clean up empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });

      if (!isEditing) {
        delete payload.status; // status is not in CreateStoreDto
      }

      if (isEditing && store) {
        await updateStore(store.id, payload as UpdateStoreRequest);
      } else {
        await createStore(payload as CreateStoreRequest);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#1a1f36]">
                {isEditing ? 'Edit Store' : 'Add Store'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store Code *</label>
                  <input type="text" name="code" required value={formData.code} onChange={handleChange} placeholder="e.g. NYC_01" className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address Line 1</label>
                  <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address Line 2</label>
                  <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State / Province</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Postal Code</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Currency</label>
                  <input type="text" name="currency" value={formData.currency} onChange={handleChange} placeholder="e.g. USD, EUR" className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Timezone</label>
                  <input type="text" name="timezone" value={formData.timezone} onChange={handleChange} placeholder="e.g. UTC, America/New_York" className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                {isEditing && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100">
                <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={onClose} disabled={loading} className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreFormModal;
