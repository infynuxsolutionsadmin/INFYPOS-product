import React, { useState, useEffect } from 'react';
import { X, Archive, AlertTriangle, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Product } from '../../types/products';
import { deleteProduct, permanentDeleteProduct } from '../../api/products.api';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  initialMode?: 'archive' | 'permanent';
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  initialMode = 'archive',
}) => {
  const [mode, setMode] = useState<'archive' | 'permanent'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'permanent') {
        await permanentDeleteProduct(product.id);
      } else {
        await deleteProduct(product.id, false);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const isArchive = mode === 'archive';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="inline-block bg-white rounded-3xl text-left overflow-hidden shadow-2xl border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          {/* Header Banner */}
          <div className={`px-6 py-5 text-white flex justify-between items-center transition-colors ${
            isArchive 
              ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
              : 'bg-gradient-to-r from-red-600 to-rose-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                {isArchive ? <Archive className="h-6 w-6 text-white" /> : <AlertTriangle className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {isArchive ? 'Archive Product (Soft Delete)' : 'Permanently Delete (Hard Delete)'}
                </h3>
                <p className="text-xs text-white/90 font-medium">
                  {isArchive ? 'Recommended • Safe & Recoverable' : 'Danger Zone • Permanent Purge'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Product Summary Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#1a1f36]">{product.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  SKU: <span className="font-semibold text-gray-700">{product.sku}</span>
                  {product.barcode && <> • Barcode: <span className="font-semibold text-gray-700">{product.barcode}</span></>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-400">Price</div>
                <div className="text-sm font-bold text-[#1a1f36]">${Number(product.sellingPrice).toFixed(2)}</div>
              </div>
            </div>

            {/* Mode Explanations */}
            {isArchive ? (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  What happens when archived:
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-900/90 pl-1">
                  <li>Hidden from cashier POS terminals and active checkout.</li>
                  <li><strong>Preserves all historical receipts</strong>, invoices, and sales reports.</li>
                  <li>Keeps inventory audit history intact for tax compliance.</li>
                  <li><strong>Can be restored anytime</strong> with one click from the Inactive filter.</li>
                </ul>
              </div>
            ) : (
              <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-950 text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Permanent Deletion Rules:
                </div>
                <p>
                  This completely removes the item and linked store inventory records from the database. <strong>This action cannot be undone.</strong>
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200/60 font-medium text-rose-800">
                  🛡️ <strong>Safety Lock:</strong> If this product was ever sold in a transaction, deletion will be blocked to protect financial records.
                </div>
              </div>
            )}

            {/* Switch Mode Option */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-gray-100">
              <span className="text-gray-500">Need a different action?</span>
              {isArchive ? (
                <button
                  type="button"
                  onClick={() => { setError(null); setMode('permanent'); }}
                  className="font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Switch to Permanent Delete (Hard Delete)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setError(null); setMode('archive'); }}
                  className="font-bold text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center gap-1"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Switch to Safe Archive (Soft Delete)
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-50/70 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100 rounded-b-3xl gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className={`w-full inline-flex justify-center items-center gap-2 rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(0,0,0,0.15)] px-6 py-2.5 text-xs font-bold text-white focus:outline-none hover:-translate-y-0.5 transition-all sm:w-auto disabled:opacity-50 disabled:pointer-events-none ${
                isArchive
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/25'
              }`}
            >
              {isArchive ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {loading 
                ? (isArchive ? 'Archiving...' : 'Deleting...') 
                : (isArchive ? 'Archive Product' : 'Permanently Delete')}
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

export default DeleteConfirmModal;
