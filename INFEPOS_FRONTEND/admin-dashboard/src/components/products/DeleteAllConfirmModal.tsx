import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteAllProducts } from '../../api/products.api';

interface DeleteAllConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  totalProductsCount: number;
}

export const DeleteAllConfirmModal: React.FC<DeleteAllConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  totalProductsCount,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeleteAll = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteAllProducts();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="inline-block bg-white rounded-3xl text-left overflow-hidden shadow-2xl border border-red-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete All Products</h3>
                <p className="text-xs text-red-100 font-medium">Danger Zone: Purge entire product catalog</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs leading-relaxed space-y-2">
              <p className="font-bold text-amber-900 text-sm">⚠️ Are you sure you want to proceed?</p>
              <p>
                This action will permanently delete <strong className="font-extrabold text-red-700">{totalProductsCount}</strong> product catalog items and all linked store inventory records from the database.
              </p>
              <p className="text-amber-800 font-medium">
                This is ideal if you want a clean slate before importing a new product CSV file.
              </p>
            </div>
          </div>

          <div className="bg-slate-50/70 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100 rounded-b-3xl gap-3">
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={loading}
              className="w-full inline-flex justify-center items-center gap-2 rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)] px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-xs font-bold text-white hover:from-red-700 hover:to-rose-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:w-auto disabled:opacity-50 disabled:pointer-events-none"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Deleting All Products...' : `Yes, Delete All ${totalProductsCount} Products`}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:w-auto disabled:opacity-50 disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
