import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Landmark, Loader2, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { createSale } from '../../api/sales.api';
import { useSyncStore } from '../../stores/syncStore';
import { isDesktopApp } from '../../services/localDb';
import type { PaymentMethod, Sale } from '../../types/sale';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: (sale: Sale, isOffline?: boolean) => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'CASH', label: 'Cash', icon: <Banknote size={24} /> },
  { id: 'CARD', label: 'Card', icon: <CreditCard size={24} /> },
  { id: 'UPI', label: 'UPI', icon: <Smartphone size={24} /> },
  { id: 'BANK_TRANSFER', label: 'Bank', icon: <Landmark size={24} /> },
];

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const getSummary = useCartStore((s) => s.getSummary);
  const cartSummary = getSummary();
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const currentShift = useShiftStore((s) => s.currentShift);
  const addSyncEvent = useSyncStore((s) => s.addEvent);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedDiscount = parseFloat(discountAmount) || 0;
  const finalTotal = Math.max(0, cartSummary.grandTotal - parsedDiscount);

  const handleConfirm = async () => {
    if (!user?.storeId) {
      setError('Store ID is missing from your session.');
      return;
    }
    setLoading(true);
    setError(null);
    
    const payload = {
      shiftId: currentShift?.id,
      storeId: user.storeId,
      discountAmount: parsedDiscount,
      payments: [{
        paymentMethod,
        amount: finalTotal,
      }],
      items: cartItems.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
    };

    try {
      const sale = await createSale(payload);
      onSuccess(sale, false);
    } catch (err: any) {
      // Check if it's a network error (no response)
      if (!err.response && !isDesktopApp()) {
        // Handle offline sale for browser mode
        const syncEvent = addSyncEvent('SALE', payload);
        
        // Construct a mock Sale object to show on Receipt
        const mockSale: Sale = {
          id: syncEvent.eventId,
          tenantId: 'offline-tenant',
          storeId: payload.storeId,
          userId: user.id,
          customerId: null,
          customerName: null,
          customerCode: null,
          saleNumber: `OFFLINE-${Math.floor(Math.random() * 1000000)}`,
          subtotal: cartSummary.subtotal,
          taxAmount: cartSummary.totalVat,
          discountAmount: payload.discountAmount,
          grandTotal: finalTotal,
          paymentMethod: paymentMethod,
          status: 'COMPLETED',
          notes: 'Offline sale pending sync',
          createdAt: syncEvent.occurredAt,
          updatedAt: syncEvent.occurredAt,
          shiftId: payload.shiftId || null,
          items: cartItems.map(i => ({
            id: `item-${Math.random()}`,
            saleId: syncEvent.eventId,
            productId: i.product.id,
            productName: i.product.name,
            sku: i.product.sku,
            barcode: i.product.barcode || null,
            quantity: i.quantity,
            returnedQuantity: 0,
            unitPrice: i.unitPrice,
            vatRate: i.product.vatRate,
            lineTotal: i.lineTotal,
            createdAt: syncEvent.occurredAt
          }))
        };
        onSuccess(mockSale, true);
      } else {
        const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to complete sale.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="pos-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--pos-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Payment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--pos-text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ display: 'flex', gap: '0.6rem', background: 'var(--pos-danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Summary */}
          <div style={{ background: 'var(--pos-surface-2)', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos-text-muted)' }}>
              <span>Subtotal</span>
              <span>{fmt(cartSummary.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos-text-muted)' }}>
              <span>VAT</span>
              <span>{fmt(cartSummary.totalVat)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <span style={{ color: 'var(--pos-text-muted)' }}>Discount</span>
              <div style={{ position: 'relative', width: '100px' }}>
                <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pos-text-muted)' }}>£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="pos-input"
                  style={{ paddingLeft: '1.5rem', paddingRight: '0.5rem', height: '32px', fontSize: '0.9rem' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--pos-border)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Amount Due</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--pos-accent)' }}>{fmt(finalTotal)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Select Payment Method</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    borderRadius: 12,
                    background: paymentMethod === method.id ? 'var(--pos-accent-light)' : 'var(--pos-surface-2)',
                    border: `2px solid ${paymentMethod === method.id ? 'var(--pos-accent)' : 'transparent'}`,
                    color: paymentMethod === method.id ? 'var(--pos-accent)' : 'var(--pos-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {method.icon}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{method.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--pos-border)', background: 'var(--pos-surface-2)' }}>
          <button
            className="btn-pos btn-success"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
            ) : (
              `Confirm Payment ${fmt(finalTotal)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
