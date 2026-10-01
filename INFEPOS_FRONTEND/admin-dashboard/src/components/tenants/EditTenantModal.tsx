import React, { useState, useEffect } from 'react';
import type { Tenant } from '../../api/tenants.api';

interface EditTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<Tenant>) => Promise<void>;
}

const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, tenant, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }>({
    name: '',
    code: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
      });
    }
  }, [tenant]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSubmit(tenant.id, formData);
      onClose();
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || err.message || 'Failed to update tenant';
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
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg p-6 overflow-hidden">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              Manage Tenant: {tenant.name}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-4">
                Update company details or change their account status.
              </p>
              {error && (
                <div className="mt-2 mb-4 p-2 bg-red-50 text-red-700 text-sm rounded">
                  {Array.isArray(error) ? error.join(', ') : error}
                </div>
              )}
              <form id="edit-tenant-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Code</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            form="edit-tenant-form"
            disabled={loading}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTenantModal;
