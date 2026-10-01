import React, { useState } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import PaymentModal from './PaymentModal';
import ReceiptView from './ReceiptView';
import type { Sale } from '../../types/sale';

const CartPanel: React.FC = () => {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const incrementQuantity = useCartStore((s) => s.incrementQuantity);
  const decrementQuantity = useCartStore((s) => s.decrementQuantity);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSummary = useCartStore((s) => s.getSummary);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ sale: Sale; isOffline: boolean } | null>(null);

  const summary = getSummary();

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--pos-surface)',
        borderLeft: '1px solid var(--pos-border)',
      }}
    >
      {/* Cart Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--pos-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={18} color="var(--pos-accent)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cart</span>
          {summary.itemCount > 0 && (
            <span
              className="badge badge-blue"
              style={{ fontSize: '0.7rem' }}
            >
              {summary.itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            id="btn-clear-cart"
            type="button"
            className="btn-pos btn-ghost"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
            onClick={clearCart}
            title="Clear cart"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {items.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--pos-text-dim)',
              gap: '0.75rem',
            }}
          >
            <ShoppingCart size={40} strokeWidth={1.5} />
            <p style={{ fontSize: '0.85rem', textAlign: 'center' }}>
              Cart is empty.
              <br />
              Search or tap a product to add.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {items.map((item) => (
              <div
                key={item.product.id}
                className="animate-fade-in"
                style={{
                  background: 'var(--pos-surface-2)',
                  border: '1px solid var(--pos-border)',
                  borderRadius: 10,
                  padding: '0.65rem 0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: 'var(--pos-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.product.name}
                    >
                      {item.product.name}
                    </p>
                    <p style={{ fontSize: '0.73rem', color: 'var(--pos-text-muted)', marginTop: '0.1rem' }}>
                      {item.product.sku}
                      {item.product.barcode ? ` · ${item.product.barcode}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--pos-text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.1rem',
                    }}
                    title="Remove item"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Quantity controls + line total */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      id={`btn-decrement-${item.product.id}`}
                      type="button"
                      onClick={() => decrementQuantity(item.product.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'var(--pos-border)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--pos-text)',
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) updateQuantity(item.product.id, val);
                      }}
                      style={{
                        width: 40,
                        height: 28,
                        textAlign: 'center',
                        background: 'var(--pos-bg)',
                        border: '1px solid var(--pos-border)',
                        borderRadius: 6,
                        color: 'var(--pos-text)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                    <button
                      id={`btn-increment-${item.product.id}`}
                      type="button"
                      onClick={() => incrementQuantity(item.product.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'var(--pos-accent)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pos-text)' }}>
                      {fmt(item.lineTotal)}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--pos-text-muted)' }}>
                      {fmt(item.unitPrice)} ea
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {items.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--pos-border)',
            padding: '1rem 1.25rem',
            background: 'var(--pos-surface)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--pos-text-muted)' }}>
              <span>Subtotal ({summary.itemCount} items)</span>
              <span>{fmt(summary.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--pos-text-muted)' }}>
              <span>VAT</span>
              <span>{fmt(summary.totalVat)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1.2rem',
                color: 'var(--pos-text)',
                borderTop: '1px solid var(--pos-border)',
                paddingTop: '0.5rem',
                marginTop: '0.2rem',
              }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--pos-success)' }}>{fmt(summary.grandTotal)}</span>
            </div>
          </div>

          {/* Payment placeholder button */}
          <button
            id="btn-proceed-payment"
            type="button"
            className="btn-pos btn-success"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => setIsPaymentOpen(true)}
          >
            Proceed to Payment
          </button>
        </div>
      )}

      {/* Modals */}
      {isPaymentOpen && (
        <PaymentModal
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={(sale, isOffline = false) => {
            setIsPaymentOpen(false);
            setCompletedSale({ sale, isOffline });
            clearCart();
          }}
        />
      )}

      {completedSale && (
        <ReceiptView
          sale={completedSale.sale}
          isOffline={completedSale.isOffline}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};

export default CartPanel;
