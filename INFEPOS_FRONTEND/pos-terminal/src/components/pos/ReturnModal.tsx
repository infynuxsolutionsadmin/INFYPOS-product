import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { getReturnableSale, createSaleReturn } from '../../api/sales.api';
import type { Sale } from '../../types/sale';
import { useShiftStore } from '../../stores/shiftStore';
import { useSyncStore } from '../../stores/syncStore';

interface ReturnModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ sale, onClose, onSuccess }) => {
  const currentShift = useShiftStore((s) => s.currentShift);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [returnableData, setReturnableData] = useState<any>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchReturnable = async () => {
      try {
        const data = await getReturnableSale(sale.id);
        setReturnableData(data);
        
        // Init state
        const initialQs: Record<string, number> = {};
        const initialRs: Record<string, string> = {};
        data.returnableItems.forEach((item: any) => {
          initialQs[item.saleItemId] = 0;
          initialRs[item.saleItemId] = 'CUSTOMER_CHANGE_MIND';
        });
        setReturnQuantities(initialQs);
        setReturnReasons(initialRs);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to fetch returnable items.');
      } finally {
        setLoading(false);
      }
    };
    fetchReturnable();
  }, [sale.id]);

  const handleQtyChange = (itemId: string, value: string, max: number) => {
    let val = parseFloat(value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > max) val = max;
    setReturnQuantities(prev => ({ ...prev, [itemId]: val }));
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setReturnReasons(prev => ({ ...prev, [itemId]: reason }));
  };

  const handleConfirmReturn = async () => {
    if (!returnableData) return;
    
    const itemsToReturn = returnableData.returnableItems
      .filter((i: any) => returnQuantities[i.saleItemId] > 0)
      .map((i: any) => ({
        saleItemId: i.saleItemId,
        quantity: returnQuantities[i.saleItemId],
        reason: returnReasons[i.saleItemId],
      }));

    if (itemsToReturn.length === 0) {
      setError('Please specify at least one item to return.');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    const payload = {
      shiftId: currentShift?.id,
      originalSaleId: sale.id,
      refundMethod: sale.paymentMethod, // Defaulting to original payment method
      items: itemsToReturn,
    };

    try {
      await createSaleReturn(payload);
      onSuccess();
    } catch (err: any) {
      if (!err.response) {
        // Offline / Network error
        useSyncStore.getState().addEvent('SALE_RETURN', payload);
        alert('Return saved locally. It will sync when online.');
        onSuccess();
      } else {
        const msg = err?.response?.data?.message || 'Failed to process return.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  const totalRefundAmount = returnableData?.returnableItems.reduce((acc: number, item: any) => {
    const qty = returnQuantities[item.saleItemId] || 0;
    const lineTotal = qty * Number(item.unitPrice);
    const lineTax = lineTotal * (Number(item.vatRate || 0) / 100);
    return acc + lineTotal + lineTax;
  }, 0) || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="pos-card animate-fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--pos-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--pos-danger)' }}>Return Items - Sale #{sale.saleNumber}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--pos-text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ display: 'flex', gap: '0.6rem', background: 'var(--pos-danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : !returnableData || returnableData.returnableItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--pos-text-muted)' }}>No returnable items found for this sale.</div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pos-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Item</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Available</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Return Qty</th>
                    <th style={{ padding: '0.5rem', width: '150px' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {returnableData.returnableItems.map((item: any) => (
                    <tr key={item.saleItemId} style={{ borderBottom: '1px solid var(--pos-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--pos-text-muted)' }}>{fmt(item.unitPrice)} ea</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {item.availableToReturn}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={item.availableToReturn}
                          step="1"
                          className="pos-input"
                          style={{ width: '70px', textAlign: 'center', padding: '0.25rem' }}
                          value={returnQuantities[item.saleItemId]}
                          onChange={(e) => handleQtyChange(item.saleItemId, e.target.value, item.availableToReturn)}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <select
                          className="pos-input"
                          style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                          value={returnReasons[item.saleItemId]}
                          onChange={(e) => handleReasonChange(item.saleItemId, e.target.value)}
                        >
                          <option value="DEFECTIVE">Defective</option>
                          <option value="WRONG_ITEM">Wrong Item</option>
                          <option value="CUSTOMER_CHANGE_MIND">Changed Mind</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '1.25rem', fontWeight: 700 }}>
                Estimated Refund: <span style={{ color: 'var(--pos-danger)' }}>{fmt(totalRefundAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--pos-border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: 'var(--pos-surface-2)' }}>
          <button className="btn-pos btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-pos" style={{ background: 'var(--pos-danger)', color: '#fff' }} onClick={handleConfirmReturn} disabled={submitting || loading || totalRefundAmount === 0}>
            {submitting ? <Loader2 className="animate-spin" size={18} /> : `Process Return`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
