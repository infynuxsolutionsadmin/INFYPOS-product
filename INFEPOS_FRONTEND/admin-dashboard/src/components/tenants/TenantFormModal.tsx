import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const TenantFormModal: React.FC<TenantFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || err.message || 'Failed to create tenant';
      if (typeof errorMessage === 'object' && !Array.isArray(errorMessage)) {
        errorMessage = JSON.stringify(errorMessage);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative z-10 bg-white rounded-[30px] shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 w-full max-w-lg p-8 overflow-hidden">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-xl font-bold text-[#1a1f36]" id="modal-title">
                Create New Tenant
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Add a new company and their initial owner account.
                </p>
                {error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                    {Array.isArray(error) ? error.join(', ') : error}
                  </div>
                )}
                <form id="tenant-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Company Name</label>
                    <input
                      type="text"
                      required
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Company Code (e.g. INFYNUX)</label>
                    <input
                      type="text"
                      required
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm uppercase"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  
                  <hr className="my-4" />
                  <h4 className="font-medium text-sm text-gray-900">Owner Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">First Name</label>
                      <input
                        type="text"
                        required
                        className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                        value={formData.ownerFirstName}
                        onChange={e => setFormData({ ...formData, ownerFirstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Last Name</label>
                      <input
                        type="text"
                        required
                        className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                        value={formData.ownerLastName}
                        onChange={e => setFormData({ ...formData, ownerLastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Owner Email</label>
                    <input
                      type="email"
                      required
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                      value={formData.ownerEmail}
                      onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Temporary Password</label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                        value={formData.ownerPassword}
                        onChange={e => setFormData({ ...formData, ownerPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              form="tenant-form"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default TenantFormModal;
