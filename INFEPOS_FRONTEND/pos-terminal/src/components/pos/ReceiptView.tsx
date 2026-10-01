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
          maxWidth: '400px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--pos-bg)', // using a distinct background for receipt
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '1px dashed var(--pos-border)' }}>
          {isOffline ? (
            <CloudOff size={48} color="var(--pos-warning)" style={{ margin: '0 auto 1rem' }} />
          ) : (
            <CheckCircle2 size={48} color="var(--pos-success)" style={{ margin: '0 auto 1rem' }} />
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {isOffline ? 'Sale Saved Locally' : 'Payment Successful'}
          </h2>
          {isOffline && (
            <p style={{ color: 'var(--pos-warning)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Pending Synchronization
            </p>
          )}
          <p style={{ color: 'var(--pos-text-muted)', fontSize: '0.85rem' }}>Sale #{sale.saleNumber}</p>
        </div>

        {/* Printable Receipt Area */}
        <div 
          id="printable-receipt"
          style={{ 
            padding: '1.5rem', 
            overflowY: 'auto', 
            flex: 1,
            background: '#fff',
            color: '#000',
            fontFamily: 'monospace'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>INFYPOS</h3>
            <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>Store ID: {sale.storeId ? sale.storeId.slice(0, 8) : 'N/A'}</p>
            <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>{sale.createdAt ? new Date(sale.createdAt).toLocaleString() : 'Just now'}</p>
            <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>Receipt #: {sale.saleNumber || 'Pending'}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '1rem' }} />

          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ paddingBottom: '0.5rem' }}>Item</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'center' }}>Qty</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '0.25rem 0', verticalAlign: 'top' }}>
                    <div>{item.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{item.sku}</div>
                  </td>
                  <td style={{ padding: '0.25rem 0', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                  <td style={{ padding: '0.25rem 0', textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #ccc', marginTop: '1rem', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '4px 0' }}>
              <span>Subtotal:</span>
              <span>{fmt(sale.subtotal)}</span>
            </div>
            {Number(sale.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '4px 0' }}>
                <span>Discount:</span>
                <span>-{fmt(sale.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '4px 0' }}>
              <span>VAT:</span>
              <span>{fmt(sale.taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, margin: '8px 0', paddingTop: '8px', borderTop: '1px dashed #ccc' }}>
              <span>TOTAL:</span>
              <span>{fmt(sale.grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '4px 0' }}>
              <span>Paid by {sale.paymentMethod}:</span>
              <span>{fmt(sale.grandTotal)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: '#666' }}>
            <p>Thank you for your purchase!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--pos-border)', display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-pos btn-ghost"
            style={{ flex: 1, padding: '0.75rem' }}
            onClick={onClose}
          >
            New Sale
          </button>
          <button
            className="btn-pos btn-primary"
            style={{ flex: 1, padding: '0.75rem' }}
            onClick={handlePrint}
          >
            <Printer size={18} style={{ marginRight: '4px' }} />
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
