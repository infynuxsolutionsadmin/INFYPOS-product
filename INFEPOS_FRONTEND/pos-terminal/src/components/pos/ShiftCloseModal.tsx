import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, AlertCircle, Printer, CheckCircle } from 'lucide-react';
import { getXReport, closeShift, getZReport } from '../../api/shifts.api';
import { useShiftStore } from '../../stores/shiftStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface ShiftCloseModalProps {
  onClose: () => void;
}

const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const currentShift = useShiftStore((s) => s.currentShift);
  const clearShift = useShiftStore((s) => s.clearShift);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [step, setStep] = useState<'X_REPORT' | 'CASH_UP' | 'Z_REPORT'>('X_REPORT');
  
  const [xReport, setXReport] = useState<any>(null);
  const [zReport, setZReport] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [declaredCash, setDeclaredCash] = useState<string>('');
  
  useEffect(() => {
    if (!currentShift) return;
    
    const loadXReport = async () => {
      try {
        const report = await getXReport(currentShift.id);
        setXReport(report);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load X-Report');
      } finally {
        setLoading(false);
      }
    };
    
    loadXReport();
  }, [currentShift]);

  const handleProceedToCashUp = () => {
    setStep('CASH_UP');
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    
    const cash = parseFloat(declaredCash);
    if (isNaN(cash) || cash < 0) {
      setError('Please enter a valid declared cash amount');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await closeShift(currentShift.id, { declaredCash: cash });
      const zReportData = await getZReport(currentShift.id);
      setZReport(zReportData);
      setStep('Z_REPORT');
      clearShift();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to close shift';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAndLogout = () => {
    window.print();
    setTimeout(() => {
      clearAuth();
      navigate('/login', { replace: true });
    }, 500);
  };

  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  if (!currentShift) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="pos-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--pos-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--pos-accent)" />
            {step === 'X_REPORT' ? 'X-Report (Preview)' : step === 'CASH_UP' ? 'Cash-up' : 'Z-Report (Closed)'}
          </h2>
          {step !== 'Z_REPORT' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--pos-text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content */}
        <div id="printable-report" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: step === 'Z_REPORT' ? '#fff' : 'var(--pos-bg)', color: step === 'Z_REPORT' ? '#000' : 'inherit' }}>
          {error && (
            <div style={{ display: 'flex', gap: '0.6rem', background: 'var(--pos-danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : step === 'X_REPORT' && xReport ? (
            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Shift X-Report</h3>
              <p>Shift ID: {currentShift.id.slice(0, 8)}</p>
              <p>Opened: {new Date(xReport.openedAt).toLocaleString()}</p>
              <div style={{ borderBottom: '1px dashed var(--pos-border)', margin: '1rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Starting Float:</span>
                <span>{fmt(xReport.startingFloat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Gross Sales:</span>
                <span>{fmt(xReport.grossSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', color: 'var(--pos-danger)' }}>
                <span>Discounts:</span>
                <span>-{fmt(xReport.totalDiscounts || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', color: 'var(--pos-danger)' }}>
                <span>Returns:</span>
                <span>-{fmt(xReport.totalReturns || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Net Sales:</span>
                <span>{fmt(xReport.netSales)}</span>
              </div>
              
              <div style={{ borderBottom: '1px dashed var(--pos-border)', margin: '1rem 0' }} />
              
              <h4 style={{ marginBottom: '0.5rem' }}>Payment Methods:</h4>
              {Object.entries(xReport.paymentTotals || {}).map(([method, amount]: [string, any]) => (
                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', paddingLeft: '1rem' }}>
                  <span>{method}:</span>
                  <span>{fmt(amount)}</span>
                </div>
              ))}
              
              <div style={{ borderBottom: '1px dashed var(--pos-border)', margin: '1rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Expected Cash In Drawer:</span>
                <span style={{ color: 'var(--pos-accent)' }}>{fmt(xReport.expectedCash)}</span>
              </div>
            </div>
          ) : step === 'CASH_UP' && xReport ? (
            <div>
              <p style={{ color: 'var(--pos-text-muted)', marginBottom: '1.5rem' }}>
                Please count the cash in the till (including float) and enter the total below.
              </p>
              
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Declared Cash</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pos-text-muted)', fontSize: '1.25rem' }}>£</span>
                <input
                  type="number"
                  className="pos-input"
                  style={{ fontSize: '1.5rem', paddingLeft: '2.5rem', height: '3.5rem', fontWeight: 700 }}
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
            </div>
          ) : step === 'Z_REPORT' && zReport ? (
            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle size={32} color="var(--pos-success)" style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ margin: 0 }}>Shift Z-Report</h3>
                <p>Z-Report #{zReport.zReportNumber}</p>
              </div>
              
              <p>Store ID: {zReport.storeId.slice(0, 8)}</p>
              <p>Cashier: {zReport.cashierName}</p>
              <p>Opened: {new Date(zReport.openedAt).toLocaleString()}</p>
              <p>Closed: {new Date(zReport.closedAt).toLocaleString()}</p>
              
              <div style={{ borderBottom: '1px dashed #ccc', margin: '1rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Starting Float:</span>
                <span>{fmt(zReport.startingFloat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Gross Sales:</span>
                <span>{fmt(zReport.grossSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Total Discounts:</span>
                <span>-{fmt(zReport.totalDiscounts || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Total Returns:</span>
                <span>-{fmt(zReport.totalReturns || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontWeight: 'bold' }}>
                <span>Net Sales:</span>
                <span>{fmt(zReport.netSales)}</span>
              </div>
              
              <div style={{ borderBottom: '1px dashed #ccc', margin: '1rem 0' }} />
              
              <h4 style={{ margin: '0 0 0.5rem' }}>Payments</h4>
              {Object.entries(zReport.paymentTotals || {}).map(([method, amount]: [string, any]) => (
                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', paddingLeft: '1rem' }}>
                  <span>{method}:</span>
                  <span>{fmt(amount)}</span>
                </div>
              ))}
              
              <div style={{ borderBottom: '1px dashed #ccc', margin: '1rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Expected Cash:</span>
                <span>{fmt(zReport.expectedCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Declared Cash:</span>
                <span>{fmt(zReport.declaredCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontWeight: 'bold', color: zReport.cashDifference < 0 ? '#dc2626' : 'inherit' }}>
                <span>Difference:</span>
                <span>{fmt(zReport.cashDifference)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--pos-border)', display: 'flex', gap: '1rem', background: 'var(--pos-surface-2)' }}>
          {step === 'X_REPORT' && (
            <>
              <button className="btn-pos btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-pos btn-primary" style={{ flex: 1 }} onClick={handleProceedToCashUp}>Proceed to Close</button>
            </>
          )}
          {step === 'CASH_UP' && (
            <>
              <button className="btn-pos btn-ghost" style={{ flex: 1 }} onClick={() => setStep('X_REPORT')} disabled={loading}>Back</button>
              <button className="btn-pos" style={{ flex: 1, background: 'var(--pos-danger)', color: '#fff' }} onClick={handleCloseShift} disabled={loading || !declaredCash}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Finalize & Close Shift'}
              </button>
            </>
          )}
          {step === 'Z_REPORT' && (
            <button className="btn-pos btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={handlePrintAndLogout}>
              <Printer size={18} style={{ marginRight: '8px' }} />
              Print Z-Report & Logout
            </button>
          )}
        </div>
      </div>
      
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0; color: #000; }
          }
        `}
      </style>
    </div>
  );
};

export default ShiftCloseModal;
