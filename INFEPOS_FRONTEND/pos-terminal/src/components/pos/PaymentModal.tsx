import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Landmark, Loader2, AlertCircle, Wallet, Lock, ArrowRight, Circle, CheckCircle2 } from 'lucide-react';
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

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'CASH', label: 'Cash', desc: 'Receive cash from customer', icon: <Banknote size={22} /> },
  { id: 'CARD', label: 'Card', desc: 'Pay securely with your card', icon: <CreditCard size={22} /> },
  { id: 'UPI', label: 'UPI', desc: 'Pay using UPI apps', icon: <Smartphone size={22} /> },
  { id: 'BANK_TRANSFER', label: 'Bank', desc: 'Direct bank transfer', icon: <Landmark size={22} /> },
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
  const [customerPhone, setCustomerPhone] = useState<string>('');
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
      customerPhone: customerPhone.trim() || undefined,
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ padding: '1.5rem 2rem 1.25rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Payment Method</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Choose your preferred payment method to complete the transaction.</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
              <X size={28} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 2rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '10px', padding: '0.75rem 1rem', color: '#991b1b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Customer & Amount Summary */}
        <div style={{ padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Customer Input */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem 1.75rem', borderRadius: '12px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Customer Phone <span style={{fontSize: '0.8rem', fontWeight: 400}}>(Optional)</span></span>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="pos-input"
              style={{ width: '160px', height: '36px', fontSize: '0.95rem', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              placeholder="+1 234..."
            />
          </div>

          <div style={{ 
            background: '#f8fafc', 
            borderRadius: '12px', 
            padding: '1.25rem 1.75rem', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Wallet size={24} />
              </div>
              <div>
                <div style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '0.15rem' }}>Total Amount Due</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#16A34A', lineHeight: 1 }}>{fmt(finalTotal)}</div>
              </div>
            </div>

            <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch', margin: '0 1.5rem' }}></div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
                <span>Subtotal</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>{fmt(cartSummary.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
                <span>VAT (20%)</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>{fmt(cartSummary.totalVat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem', alignItems: 'center' }}>
                <span>Discount</span>
                <div style={{ display: 'flex', alignItems: 'center', color: '#334155', fontWeight: 500 }}>
                  <span style={{ marginRight: '2px' }}>£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    style={{ 
                      width: '80px', 
                      background: 'transparent', 
                      border: 'none', 
                      borderBottom: '1px solid transparent', 
                      color: '#334155', 
                      fontWeight: 500, 
                      fontSize: '0.9rem', 
                      textAlign: 'right', 
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => (e.target.style.borderBottomColor = '#cbd5e1')}
                    onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ padding: '1.5rem 2rem 1.25rem 2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Select Payment Method</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    background: isSelected ? '#f0f7ff' : '#ffffff',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: isSelected ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#2563eb' : '#64748b', marginRight: '1rem', flexShrink: 0 }}>
                    {method.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.15rem' }}>{method.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{method.desc}</div>
                  </div>
                  <div style={{ marginLeft: '0.75rem', color: isSelected ? '#2563eb' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></div>
                      </div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #cbd5e1' }}></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ 
              width: '100%', 
              background: '#16A34A', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '10px', 
              fontSize: '1.15rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#15803d')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#16A34A')}
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={20} />
                  <span>Confirm Payment</span>
                  <span style={{ margin: '0 0.25rem' }}>{fmt(finalTotal)}</span>
                </div>
                <ArrowRight size={24} style={{ position: 'absolute', right: 0 }} />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
