import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreateGoodsReceiptPayload, CreateGoodsReceiptItemPayload } from '../../types/goodsReceipts';
import type { Purchase } from '../../types/purchases';
import { createGoodsReceipt } from '../../api/goodsReceipts.api';
import { getPurchases } from '../../api/purchases.api';

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState<{
    purchaseId: string;
    notes: string;
    items: Record<string, number>; // purchaseItemId -> receivedQuantity
  }>({
    purchaseId: '',
    notes: '',
    items: {},
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        purchaseId: '',
        notes: '',
        items: {},
      });
      setSelectedPurchase(null);
      setError(null);
      fetchPurchases();
    }
  }, [isOpen]);

  const fetchPurchases = async () => {
    try {
      setIsSearching(true);
      // Fetch only purchases that are eligible for receiving
      const data = await getPurchases({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      // The backend says: Reject if CANCELLED, DRAFT, APPROVED or RECEIVED.
      // So valid ones are generally ORDERED, PARTIALLY_RECEIVED
      const validPurchases = data.items.filter(
        p => p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED'
      );
      setPurchases(validPurchases);
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchaseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const purchase = purchases.find(p => p.id === pId) || null;
    setSelectedPurchase(purchase);
    
    // Auto-fill receive quantities with remaining
    const initialItems: Record<string, number> = {};
    if (purchase?.items) {
      purchase.items.forEach(item => {
        const remaining = Number(item.orderedQuantity) - Number(item.receivedQuantity);
        if (remaining > 0) {
          initialItems[item.id] = remaining;
        }
      });
    }

    setFormData(prev => ({
      ...prev,
      purchaseId: pId,
      items: initialItems,
    }));
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const num = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: isNaN(num) ? 0 : num,
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.purchaseId) {
      setError('Please select a purchase order.');
      return;
    }

    const itemsPayload: CreateGoodsReceiptItemPayload[] = [];
    
    for (const [itemId, qty] of Object.entries(formData.items)) {
      if (qty > 0) {
        itemsPayload.push({
          purchaseItemId: itemId,
          receivedQuantity: qty,
        });
      }
    }

    if (itemsPayload.length === 0) {
      setError('Please enter at least one positive received quantity.');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateGoodsReceiptPayload = {
        purchaseId: formData.purchaseId,
        notes: formData.notes || undefined,
        items: itemsPayload,
      };

      await createGoodsReceipt(payload);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Receive Goods
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Purchase Order *</label>
                <div className="relative">
                  <select 
                    required 
                    name="purchaseId" 
                    value={formData.purchaseId} 
                    onChange={handlePurchaseSelect} 
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                  >
                    <option value="" disabled>{isSearching ? 'Loading purchases...' : 'Select an eligible purchase order'}</option>
                    {purchases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.purchaseNumber} - {p.supplierName} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPurchase && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="block text-xs font-medium text-blue-800">Supplier</span>
                      <span className="text-sm text-blue-900">{selectedPurchase.supplierName}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-blue-800">Store</span>
                      <span className="text-sm text-blue-900">{selectedPurchase.store?.name || selectedPurchase.storeId}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-blue-800">Date</span>
                      <span className="text-sm text-blue-900">{selectedPurchase.orderDate ? new Date(selectedPurchase.orderDate).toLocaleDateString() : '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-blue-800">Status</span>
                      <span className="text-sm text-blue-900 font-medium">{selectedPurchase.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedPurchase && selectedPurchase.items && selectedPurchase.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 border-b pb-2">Purchase Items to Receive</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prev. Rcvd</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Receive Now</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPurchase.items.map((item) => {
                          const ordered = Number(item.orderedQuantity);
                          const received = Number(item.receivedQuantity);
                          const remaining = ordered - received;
                          
                          return (
                            <tr key={item.id} className={remaining <= 0 ? 'bg-gray-50 opacity-60' : ''}>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{ordered.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{received.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">{remaining > 0 ? remaining.toFixed(2) : '0.00'}</td>
                              <td className="px-4 py-2 whitespace-nowrap bg-blue-50">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  max={remaining > 0 ? remaining : 0}
                                  disabled={remaining <= 0}
                                  value={formData.items[item.id] !== undefined ? formData.items[item.id] : ''}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  className="block w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea 
                  name="notes" 
                  rows={3} 
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  placeholder="Optional receiving notes..."
                />
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-5 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t">
                <button 
                  type="submit" 
                  disabled={loading || !formData.purchaseId || Object.values(formData.items).every(q => q <= 0)} 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Receiving...' : 'Receive Goods'}
                </button>
                <button 
                  type="button" 
                  onClick={onClose} 
                  disabled={loading} 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
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

export default GoodsReceiptFormModal;
