import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import type { Purchase } from '../../types/purchases';
import { getPurchaseById } from '../../api/purchases.api';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string | null;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
}) => {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      fetchPurchase();
    } else {
      setPurchase(null);
    }
  }, [isOpen, purchaseId]);

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseById(purchaseId!);
      setPurchase(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchase details');
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
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-500" />
                Purchase Details
                {purchase && (
                  <span className={`ml-3 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    purchase.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 
                    purchase.status === 'APPROVED' || purchase.status === 'ORDERED' ? 'bg-blue-100 text-blue-800' :
                    purchase.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {purchase.status}
                  </span>
                )}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 text-red-500 rounded">{error}</div>
            ) : purchase ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase">Purchase Number</span>
                    <span className="block mt-1 text-sm text-gray-900 font-semibold">{purchase.purchaseNumber}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase">Order Date</span>
                    <span className="block mt-1 text-sm text-gray-900">{purchase.orderDate ? new Date(purchase.orderDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase">Store</span>
                    <span className="block mt-1 text-sm text-gray-900">{purchase.store?.name || purchase.storeId}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase">Supplier</span>
                    <span className="block mt-1 text-sm text-gray-900">{purchase.supplierName} ({purchase.supplierCode})</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 border-b pb-2">Items</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax %</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchase.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                              <div className="text-xs text-gray-500">{item.sku}</div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.orderedQuantity).toFixed(2)} {item.unit}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.receivedQuantity).toFixed(2)} {item.unit}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.unitCost).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.vatRate).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    {purchase.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{purchase.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-64 bg-gray-50 p-4 rounded-lg border">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span className="font-medium">{Number(purchase.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tax:</span>
                        <span className="font-medium">{Number(purchase.taxAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{Number(purchase.discountAmount).toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t flex justify-between text-base font-bold text-gray-900">
                        <span>Grand Total:</span>
                        <span>{purchase.currency} {Number(purchase.grandTotal).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailsModal;
