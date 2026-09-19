import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { SaleReturn } from '../../types/salesReturns';
import { getSaleReturnById } from '../../api/salesReturns.api';
import SaleReturnStatusBadge from './SaleReturnStatusBadge';

interface SaleReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnId: string | null;
}

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Defective',
  WRONG_ITEM: 'Wrong Item',
  CUSTOMER_CHANGE_MIND: 'Customer Changed Mind',
  OTHER: 'Other',
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

const SaleReturnDetailsModal: React.FC<SaleReturnDetailsModalProps> = ({
  isOpen,
  onClose,
  returnId,
}) => {
  const [saleReturn, setSaleReturn] = useState<SaleReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && returnId) {
      fetchReturn();
    } else {
      setSaleReturn(null);
      setError(null);
    }
  }, [isOpen, returnId]);

  const fetchReturn = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSaleReturnById(returnId!);
      setSaleReturn(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load return details');
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
                <RotateCcw className="h-5 w-5 text-gray-500" />
                Return Details
                {saleReturn && <SaleReturnStatusBadge status={saleReturn.status} />}
                {saleReturn && (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    saleReturn.returnType === 'FULL_RETURN' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {saleReturn.returnType === 'FULL_RETURN' ? 'Full Return' : 'Partial Return'}
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
              <div className="bg-red-50 p-4 text-red-600 rounded text-sm">{error}</div>
            ) : saleReturn ? (
              <div className="space-y-6">
                {/* Return header info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Return Number</dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">{saleReturn.returnNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Original Sale</dt>
                    <dd className="mt-1 text-sm font-semibold text-blue-600">{saleReturn.originalSale?.saleNumber || saleReturn.originalSaleId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{new Date(saleReturn.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Store</dt>
                    <dd className="mt-1 text-sm text-gray-900">{saleReturn.store?.name || saleReturn.storeId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {saleReturn.customer
                        ? `${saleReturn.customer.firstName} ${saleReturn.customer.lastName || ''}`.trim()
                        : 'Walk-in Customer'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Processed By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {saleReturn.user
                        ? `${saleReturn.user.firstName} ${saleReturn.user.lastName || ''}`.trim()
                        : saleReturn.userId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Refund Method</dt>
                    <dd className="mt-1 text-sm text-gray-900">{PAYMENT_LABELS[saleReturn.refundMethod] || saleReturn.refundMethod}</dd>
                  </div>
                </div>

                {/* Items table */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 border-b pb-2">Returned Items</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">VAT %</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {saleReturn.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                              <div className="text-xs text-gray-500">{item.sku}</div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">
                                {REASON_LABELS[item.reason] || item.reason}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.quantity).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">{Number(item.vatRate).toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">{Number(item.lineTotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals + Notes */}
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex-1">
                    {saleReturn.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{saleReturn.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-64 bg-gray-50 p-4 rounded-lg border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-medium">{Number(saleReturn.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax:</span>
                      <span className="font-medium">{Number(saleReturn.taxAmount).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-base font-bold text-green-700">
                      <span>Refund Total:</span>
                      <span>{Number(saleReturn.refundTotal).toFixed(2)}</span>
                    </div>
                    <div className="pt-1 text-xs text-gray-500 text-right">
                      via {PAYMENT_LABELS[saleReturn.refundMethod] || saleReturn.refundMethod}
                    </div>
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

export default SaleReturnDetailsModal;
