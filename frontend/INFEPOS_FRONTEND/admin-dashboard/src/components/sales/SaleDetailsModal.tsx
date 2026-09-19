import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import type { Sale } from '../../types/sales';
import { getSaleById } from '../../api/sales.api';
import SaleStatusBadge from './SaleStatusBadge';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  isOpen,
  onClose,
  saleId,
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && saleId) {
      fetchSale();
    } else {
      setSale(null);
      setError(null);
    }
  }, [isOpen, saleId]);

  const fetchSale = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSaleById(saleId!);
      setSale(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load sale details');
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
            {/* Header */}
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gray-500" />
                Sale Details
                {sale && <SaleStatusBadge status={sale.status} />}
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
              <div className="bg-red-50 p-4 text-red-600 rounded text-sm">{error}</div>
            ) : sale ? (
              <div className="space-y-6">
                {/* Sale Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Sale Number</dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">{sale.saleNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{new Date(sale.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Store</dt>
                    <dd className="mt-1 text-sm text-gray-900">{sale.store?.name || sale.storeId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Cashier</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {sale.user ? `${sale.user.firstName} ${sale.user.lastName || ''}`.trim() : sale.userId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {sale.customerName ? `${sale.customerName} (${sale.customerCode})` : 'Walk-in Customer'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Payment Method</dt>
                    <dd className="mt-1 text-sm text-gray-900">{PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}</dd>
                  </div>
                  {sale.shiftId && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">Shift</dt>
                      <dd className="mt-1 text-sm text-gray-500 font-mono text-xs truncate">{sale.shiftId}</dd>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-2">Sale Items</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">VAT %</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sale.items?.map((item) => (
                          <tr key={item.id} className={Number(item.returnedQuantity) > 0 ? 'bg-orange-50' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                              <div className="text-xs text-gray-500">{item.sku}</div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.quantity).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.vatRate).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                              {Number(item.returnedQuantity) > 0 ? (
                                <span className="text-orange-600 font-medium">{Number(item.returnedQuantity).toFixed(2)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals + Notes */}
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex-1">
                    {sale.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{sale.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-64 bg-gray-50 p-4 rounded-lg border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-medium">{Number(sale.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax:</span>
                      <span className="font-medium">{Number(sale.taxAmount).toFixed(2)}</span>
                    </div>
                    {Number(sale.discountAmount) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{Number(sale.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t flex justify-between text-base font-bold text-gray-900">
                      <span>Grand Total:</span>
                      <span>{Number(sale.grandTotal).toFixed(2)}</span>
                    </div>
                    <div className="pt-1 text-xs text-gray-500 text-right">via {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;
