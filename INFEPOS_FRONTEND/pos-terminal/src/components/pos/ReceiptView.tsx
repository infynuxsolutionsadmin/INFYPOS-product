import React from 'react';
import { Printer, CheckCircle2, CloudOff } from 'lucide-react';
import type { Sale } from '../../types/sale';

interface ReceiptViewProps {
  sale: Sale;
  isOffline?: boolean;
  onClose: () => void;
}

const ReceiptView: React.FC<ReceiptViewProps> = ({ sale, isOffline, onClose }) => {
  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;
  
  const handlePrint = () => {
    window.print();
  };

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
          maxWidth: '420px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
          {isOffline ? (
            <CloudOff size={56} color="#EAB308" style={{ margin: '0 auto 1rem' }} />
          ) : (
            <CheckCircle2 size={56} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
          )}
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#243B53', marginBottom: '0.25rem' }}>
            {isOffline ? 'Sale Saved Locally' : 'Payment Successful'}
          </h2>
          {isOffline && (
            <p style={{ color: '#EAB308', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Pending Synchronization
            </p>
          )}
          <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0 }}>Sale #{sale.saleNumber}</p>
        </div>

        {/* Printable Receipt Area */}
        <div 
          id="printable-receipt"
          style={{ 
            padding: '2rem', 
            overflowY: 'auto', 
            flex: 1,
            background: '#FFFFFF',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#243B53', margin: '0 0 0.5rem 0', letterSpacing: '1px' }}>INFEPOS</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '2px 0' }}>Store ID: {sale.storeId ? sale.storeId.slice(0, 8) : 'N/A'}</p>
            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '2px 0' }}>{sale.createdAt ? new Date(sale.createdAt).toLocaleString() : 'Just now'}</p>
            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '2px 0' }}>Receipt #: {sale.saleNumber || 'Pending'}</p>
          </div>

          <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontWeight: 600 }}>Item</th>
                <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>Qty</th>
                <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', textAlign: 'right', color: '#64748B', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '0.75rem 0', verticalAlign: 'top', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ color: '#243B53', fontWeight: 500 }}>{item.productName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.1rem' }}>{item.sku}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center', verticalAlign: 'top', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', verticalAlign: 'top', color: '#243B53', fontWeight: 500, borderBottom: '1px solid #F1F5F9' }}>{fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#64748B' }}>
              <span>Subtotal:</span>
              <span style={{ color: '#243B53' }}>{fmt(sale.subtotal)}</span>
            </div>
            {Number(sale.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#64748B' }}>
                <span>Discount:</span>
                <span style={{ color: '#243B53' }}>-{fmt(sale.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#64748B' }}>
              <span>VAT:</span>
              <span style={{ color: '#243B53' }}>{fmt(sale.taxAmount)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, color: '#243B53', margin: '0.5rem 0', padding: '1rem 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
              <span>TOTAL:</span>
              <span>{fmt(sale.grandTotal)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>Paid by {sale.paymentMethod}:</span>
              <span>{fmt(sale.grandTotal)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.95rem', color: '#64748B' }}>
            <p style={{ margin: 0 }}>Thank you for your purchase!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '1.5rem 2rem', background: '#F7F8FA', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#F1F5F9'}
            onMouseOut={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            New Sale
          </button>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1D4ED8'}
            onMouseOut={(e) => e.currentTarget.style.background = '#2563EB'}
          >
            <Printer size={20} style={{ marginRight: '0.5rem' }} />
            Print
          </button>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              padding: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ReceiptView;
