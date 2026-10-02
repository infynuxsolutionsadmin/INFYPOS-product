import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Supplier } from '../../types/suppliers';
import { deleteSupplier } from '../../api/suppliers.api';

interface DeleteSupplierConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
}

const DeleteSupplierConfirmModal: React.FC<DeleteSupplierConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !supplier) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteSupplier(supplier.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete supplier.');
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

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-xl font-bold text-[#1a1f36]">Deactivate Supplier</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to deactivate <span className="font-semibold text-gray-800">{supplier.name}</span>? 
                    The supplier will be marked as INACTIVE but their past records will be preserved.
                  </p>
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50/50 px-6 py-5 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100 rounded-b-[30px]">
            <button
              type="button"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-base font-bold text-white hover:from-red-600 hover:to-red-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleDelete}
            >
              {loading ? 'Deactivating...' : 'Deactivate'}
            </button>
            <button
              type="button"
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSupplierConfirmModal;
