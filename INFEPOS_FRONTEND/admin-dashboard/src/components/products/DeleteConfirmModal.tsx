import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../../types/products';
import { deleteProduct } from '../../api/products.api';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteProduct(product.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete product');
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1a1f36]">Delete Product</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the product <strong>{product.name}</strong> (SKU: {product.sku})? 
                This action will mark the product as inactive and hide it from your active catalog and POS till terminals while preserving past sales data.
              </p>
            </div>
          </div>
          <div className="bg-slate-50/50 px-6 py-5 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100 rounded-b-[30px]">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-base font-bold text-white hover:from-red-600 hover:to-red-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
