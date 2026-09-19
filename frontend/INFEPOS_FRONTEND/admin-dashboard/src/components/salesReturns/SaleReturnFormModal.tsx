import React, { useState } from 'react';
import { X, Search, AlertTriangle } from 'lucide-react';
import type { CreateSaleReturnPayload, CreateSaleReturnItemPayload, ReturnReason, PaymentMethod, ReturnableItem } from '../../types/salesReturns';
import { getSaleReturnable, createSaleReturn } from '../../api/salesReturns.api';

interface SaleReturnFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_OPTIONS: { value: ReturnReason; label: string }[] = [
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong Item' },
  { value: 'CUSTOMER_CHANGE_MIND', label: 'Customer Changed Mind' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
];

interface ItemRow {
  saleItemId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  availableToReturn: number;
  quantity: number;
  reason: ReturnReason;
  selected: boolean;
}

const SaleReturnFormModal: React.FC<SaleReturnFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'select-sale' | 'select-items'>('select-sale');

  // Step 1: Sale lookup
  const [saleIdInput, setSaleIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saleNumber, setSaleNumber] = useState('');
  const [saleId, setSaleId] = useState('');

  // Step 2: Item selection
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookup = async () => {
    const trimmed = saleIdInput.trim();
    if (!trimmed) {
      setLookupError('Please enter a Sale ID.');
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      const data = await getSaleReturnable(trimmed);
      if (data.returnableItems.length === 0) {
        setLookupError('This sale has no items available to return.');
        return;
      }
      setSaleId(data.saleId);
      setSaleNumber(data.saleNumber);
      setItemRows(
        data.returnableItems.map((item: ReturnableItem) => ({
          saleItemId: item.saleItemId,
          productName: item.productName,
          sku: item.sku,
          unitPrice: Number(item.unitPrice),
          availableToReturn: Number(item.availableToReturn),
          quantity: Number(item.availableToReturn),
          reason: 'DEFECTIVE',
          selected: false,
        }))
      );
      setStep('select-items');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to look up sale.';
      setLookupError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleItemCheck = (idx: number, checked: boolean) => {
    setItemRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: checked } : r));
  };

  const handleQtyChange = (idx: number, value: string) => {
    const num = parseFloat(value);
    setItemRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      return { ...r, quantity: isNaN(num) ? 0 : Math.min(Math.max(0.01, num), r.availableToReturn) };
    }));
  };

  const handleReasonChange = (idx: number, value: ReturnReason) => {
    setItemRows(prev => prev.map((r, i) => i === idx ? { ...r, reason: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const selectedItems = itemRows.filter(r => r.selected);
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one item to return.');
      return;
    }
    for (const item of selectedItems) {
      if (item.quantity <= 0 || item.quantity > item.availableToReturn) {
        setSubmitError(`Invalid quantity for "${item.productName}". Must be between 0.01 and ${item.availableToReturn}.`);
        return;
      }
    }

    const payload: CreateSaleReturnPayload = {
      originalSaleId: saleId,
      refundMethod,
      notes: notes || undefined,
      items: selectedItems.map(item => ({
        saleItemId: item.saleItemId,
        quantity: item.quantity,
        reason: item.reason,
      } as CreateSaleReturnItemPayload)),
    };

    setSubmitLoading(true);
    try {
      await createSaleReturn(payload);
      onSuccess();
      onClose();
      handleReset();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create return.';
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select-sale');
    setSaleIdInput('');
    setSaleId('');
    setSaleNumber('');
    setItemRows([]);
    setRefundMethod('CASH');
    setNotes('');
    setLookupError(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={handleClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900">
                Create Sales Return
                {saleNumber && <span className="ml-2 text-sm text-blue-600 font-normal">— {saleNumber}</span>}
              </h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Creating a return requires an active POS shift. If no shift is open, the backend will reject the request. Returns are processed by the backend — inventory is restored automatically.
              </span>
            </div>

            {step === 'select-sale' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale ID</label>
                <p className="text-xs text-gray-500 mb-3">Paste the Sale UUID from the Sales list to look up returnable items.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saleIdInput}
                    onChange={e => { setSaleIdInput(e.target.value); setLookupError(null); }}
                    placeholder="e.g. 3f4a1234-..."
                    className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    {lookupLoading ? 'Looking up...' : 'Look Up'}
                  </button>
                </div>
                {lookupError && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{lookupError}</div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{submitError}</div>
                )}

                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Select Items to Return</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Return?</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Available</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty to Return</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {itemRows.map((row, idx) => (
                          <tr key={row.saleItemId} className={row.selected ? 'bg-blue-50' : ''}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={e => handleItemCheck(idx, e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{row.productName}</div>
                              <div className="text-xs text-gray-400">{row.sku}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-gray-900">{row.availableToReturn}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0.01"
                                max={row.availableToReturn}
                                step="0.01"
                                value={row.quantity}
                                onChange={e => handleQtyChange(idx, e.target.value)}
                                disabled={!row.selected}
                                className="w-20 border border-gray-300 rounded py-1 px-2 text-sm text-right focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.reason}
                                onChange={e => handleReasonChange(idx, e.target.value as ReturnReason)}
                                disabled={!row.selected}
                                className="border border-gray-300 rounded py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40"
                              >
                                {REASON_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Refund method + Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
                    <select
                      value={refundMethod}
                      onChange={e => setRefundMethod(e.target.value as PaymentMethod)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {PAYMENT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t flex flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm disabled:opacity-50"
                  >
                    {submitLoading ? 'Submitting...' : 'Create Return'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('select-sale'); setSubmitError(null); }}
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>

          {step === 'select-sale' && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleReturnFormModal;
