import React, { useEffect, useState, useRef } from 'react';
import { Printer, CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import type { Sale } from '../../types/sale';
import { useAuthStore } from '../../stores/authStore';
import logoImg from '../../assets/transparent_logo.png';

interface ReceiptViewProps {
  sale: Sale;
  isOffline?: boolean;
  onClose: () => void;
}

const ReceiptView: React.FC<ReceiptViewProps> = ({ sale, isOffline, onClose }) => {
  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  const user = useAuthStore((s) => s.user);
  const pairedStoreName = useAuthStore((s) => s.pairedStoreName);
  // Priority: storeName from sale response (backend) → pairedStoreName set at device pairing → fallback
  const storeName = sale.storeName || pairedStoreName || user?.storeName || 'Store';

  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [autoPrint, setAutoPrint] = useState(() => {
    return localStorage.getItem('pos_auto_print_receipt') === 'true';
  });

  const hasAutoPrintedRef = useRef(false);

  // Generate clean 80mm thermal receipt HTML
  const generateReceiptHtml = () => {
    const itemRows = sale.items
      .map(
        (item) => `
        <tr>
          <td style="padding:4px 0;border-bottom:1px solid #e5e5e5;vertical-align:top;">
            <div style="font-weight:600;color:#000;font-size:11px;">${item.productName}</div>
            <div style="font-size:9px;color:#666;margin-top:1px;">${item.sku || ''}</div>
          </td>
          <td style="padding:4px 0;border-bottom:1px solid #e5e5e5;text-align:center;color:#333;font-size:11px;">${item.quantity}</td>
          <td style="padding:4px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;color:#000;font-size:11px;">${fmt(item.lineTotal)}</td>
        </tr>`
      )
      .join('');

    const discountRow =
      Number(sale.discountAmount) > 0
        ? `<tr>
            <td colspan="2" style="padding:2px 0;color:#444;font-size:11px;">Discount:</td>
            <td style="padding:2px 0;text-align:right;color:#000;font-size:11px;">-${fmt(sale.discountAmount)}</td>
           </tr>`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Receipt - ${sale.saleNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      width: 100%;
      max-width: 76mm;
      margin: 0 auto;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .header img { width: 36px; height: 36px; object-fit: contain; margin: 0 auto 4px; display: block; }
    .header h1 { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
    .header p { font-size: 10px; color: #444; margin: 1px 0; }
    .divider { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .items-table { margin-bottom: 6px; }
    .items-table th {
      font-size: 10px; font-weight: 700; color: #333;
      padding-bottom: 4px; border-bottom: 1px solid #999;
    }
    .items-table th:first-child { text-align: left; }
    .items-table th:nth-child(2) { text-align: center; }
    .items-table th:last-child { text-align: right; }
    .totals-table td { padding: 2px 0; color: #333; font-size: 11px; }
    .totals-table td:last-child { text-align: right; color: #000; font-weight: 600; }
    .total-row td {
      font-size: 13px !important; font-weight: 900 !important; color: #000 !important;
      border-top: 1px dashed #999; border-bottom: 1px dashed #999;
      padding: 5px 0 !important;
    }
    .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #555; }
    .barcode { text-align: center; margin-top: 8px; font-size: 9px; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoImg}" alt="Logo" onerror="this.style.display='none'" />
    <h1>${storeName}</h1>
    <p>Store ID: ${sale.storeId ? sale.storeId.slice(0, 8).toUpperCase() : 'N/A'}</p>
    <p>${sale.createdAt ? new Date(sale.createdAt).toLocaleString() : new Date().toLocaleString()}</p>
    <p style="font-size:10px;color:#555;margin-top:2px;font-weight:600;">Receipt #${sale.saleNumber}</p>
  </div>

  <hr class="divider"/>

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider"/>

  <table class="totals-table">
    <tbody>
      <tr>
        <td colspan="2">Subtotal:</td>
        <td>${fmt(sale.subtotal)}</td>
      </tr>
      ${discountRow}
      <tr>
        <td colspan="2">VAT / Tax:</td>
        <td>${fmt(sale.taxAmount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">TOTAL:</td>
        <td>${fmt(sale.grandTotal)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:4px;font-size:10px;color:#555;">
          Paid by ${sale.paymentMethod || 'Cash'}:
        </td>
        <td style="padding-top:4px;font-size:10px;">${fmt(sale.grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:2px;">Please retain this receipt for your records.</p>
    <div class="barcode">*${sale.saleNumber}*</div>
  </div>
</body>
</html>`;
  };

  // US POS Standard Silent / Direct Printing Method
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    try {
      const receiptHtml = generateReceiptHtml();

      // 1. Electron Desktop Native Silent Print (US POS Desktop Standard - 100% Silent, No Popups)
      const electron = (window as any).electron;
      if (electron?.printer?.printHtml) {
        await electron.printer.printHtml(receiptHtml, { silent: true });
        setPrintSuccess(true);
        return;
      }

      // 2. Web Browser Standard: Invisible Background Iframe (No popup window, no popup blocker!)
      let iframe = document.getElementById('pos-silent-receipt-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pos-silent-receipt-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        throw new Error('Unable to access print iframe document');
      }

      doc.open();
      doc.write(receiptHtml);
      doc.close();

      // Wait briefly for CSS/images to render inside the iframe before issuing print
      await new Promise((r) => setTimeout(r, 200));

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setPrintSuccess(true);
    } catch (err) {
      console.error('POS Print Error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Auto-print on checkout completion if cashier has auto-print enabled (US retail workflow)
  useEffect(() => {
    if (autoPrint && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Keyboard shortcut listener: Enter = Print or New Sale, Esc = Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleAutoPrint = (checked: boolean) => {
    setAutoPrint(checked);
    localStorage.setItem('pos_auto_print_receipt', String(checked));
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
          maxWidth: '430px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.12)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.75rem 2rem 1.25rem', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
          {isOffline ? (
            <CloudOff size={52} color="#EAB308" style={{ margin: '0 auto 0.75rem' }} />
          ) : (
            <CheckCircle2 size={52} color="#16A34A" style={{ margin: '0 auto 0.75rem' }} />
          )}
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.2rem' }}>
            {isOffline ? 'Sale Saved Locally' : 'Payment Successful'}
          </h2>
          {isOffline && (
            <p style={{ color: '#CA8A04', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>
              Pending Cloud Synchronization
            </p>
          )}
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>Receipt #{sale.saleNumber}</p>
        </div>

        {/* On-screen Thermal Receipt Preview */}
        <div
          id="printable-receipt"
          style={{
            padding: '1.5rem 2rem',
            overflowY: 'auto',
            flex: 1,
            background: '#FAFAFA',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '1.25rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <img
                src={logoImg}
                alt="INFEPOS Logo"
                style={{ width: '40px', height: '40px', objectFit: 'contain', margin: '0 auto 0.3rem' }}
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem 0', letterSpacing: '0.5px' }}>
                {storeName}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0' }}>
                Store ID: {sale.storeId ? sale.storeId.slice(0, 8).toUpperCase() : 'N/A'}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0' }}>
                {sale.createdAt ? new Date(sale.createdAt).toLocaleString() : 'Just now'}
              </p>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: '0.8rem' }}>Item</th>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #CBD5E1', textAlign: 'center', color: '#64748B', fontWeight: 600, fontSize: '0.8rem' }}>Qty</th>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #CBD5E1', textAlign: 'right', color: '#64748B', fontWeight: 600, fontSize: '0.8rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '0.5rem 0', verticalAlign: 'top', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ color: '#1E293B', fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.05rem' }}>{item.sku}</div>
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'center', verticalAlign: 'top', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right', verticalAlign: 'top', color: '#0F172A', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>
                      {fmt(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748B' }}>
                <span>Subtotal:</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{fmt(sale.subtotal)}</span>
              </div>
              {Number(sale.discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#16A34A' }}>
                  <span>Discount:</span>
                  <span>-{fmt(sale.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748B' }}>
                <span>VAT / Tax:</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{fmt(sale.taxAmount)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0.4rem 0',
                  padding: '0.75rem 0',
                  borderTop: '1px dashed #CBD5E1',
                  borderBottom: '1px dashed #CBD5E1',
                }}
              >
                <span>TOTAL:</span>
                <span>{fmt(sale.grandTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748B', marginTop: '0.1rem' }}>
                <span>Paid by {sale.paymentMethod || 'Cash'}:</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{fmt(sale.grandTotal)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#94A3B8' }}>
              <p style={{ margin: 0 }}>Thank you for your purchase!</p>
            </div>
          </div>
        </div>

        {/* Retail Settings Toolbar (Auto-print toggle) */}
        <div
          style={{
            padding: '0.65rem 1.5rem',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: '#475569',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => toggleAutoPrint(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Auto-print receipt on checkout</span>
          </label>

          {printSuccess && (
            <span style={{ color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              ✓ Sent to printer
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '1rem 1.5rem 1.25rem', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#E2E8F0')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#F1F5F9')}
          >
            New Sale (Esc)
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            style={{
              flex: 1.2,
              padding: '0.85rem',
              background: isPrinting ? '#93C5FD' : '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: isPrinting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background 0.15s ease',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            }}
            onMouseOver={(e) => {
              if (!isPrinting) e.currentTarget.style.background = '#1D4ED8';
            }}
            onMouseOut={(e) => {
              if (!isPrinting) e.currentTarget.style.background = '#2563EB';
            }}
          >
            {isPrinting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer size={18} />
                Print Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptView;
