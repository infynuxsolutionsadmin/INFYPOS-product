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

    const trimmed = declaredCash.trim();
    if (trimmed === '') {
      setError('Please enter a declared cash amount');
      return;
    }

    const cash = parseFloat(trimmed);
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

  if (!currentShift && step !== 'Z_REPORT') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          border: '1.5px solid #edf2f7',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(226, 232, 240, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} color="#7c3aed" strokeWidth={2.2} />
            </div>
            <h2
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {step === 'X_REPORT'
                ? 'X-Report (Preview)'
                : step === 'CASH_UP'
                ? 'Cash-up'
                : 'Z-Report (Closed)'}
            </h2>
          </div>

          {step !== 'Z_REPORT' && (
            <button
              onClick={onClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          id="printable-report"
          style={{
            padding: '22px 26px',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: '#ffffff',
            color: '#1e293b',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '14px',
                padding: '0.75rem 1rem',
                color: '#ef4444',
                fontSize: '0.88rem',
                marginBottom: '1rem',
                fontWeight: 500,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '3rem',
                color: '#6366f1',
              }}
            >
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : step === 'X_REPORT' && xReport ? (
            <div style={{ fontSize: '0.94rem' }}>
              {/* Centered Shift X-Report Heading Pill */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    padding: '6px 22px',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  Shift X-Report
                </span>
              </div>

              {/* Shift ID & Opened Details Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.86rem',
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  border: '1.5px solid #edf2f7',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Shift ID:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{currentShift?.id?.slice(0, 8) || ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Opened:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {new Date(xReport.openedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Starting Float Bubble Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f0f9ff',
                  border: '1.5px solid #e0f2fe',
                  borderRadius: '14px',
                  padding: '10px 16px',
                  marginBottom: '12px',
                  color: '#0369a1',
                  fontWeight: 600,
                }}
              >
                <span>Starting Float:</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0284c7' }}>
                  {fmt(xReport.startingFloat)}
                </span>
              </div>

              {/* Sales Summary Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Gross Sales:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(xReport.grossSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ef4444' }}>
                  <span style={{ fontWeight: 600 }}>Discounts:</span>
                  <span style={{ fontWeight: 700 }}>-{fmt(xReport.totalDiscounts || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ef4444' }}>
                  <span style={{ fontWeight: 600 }}>Returns:</span>
                  <span style={{ fontWeight: 700 }}>-{fmt(xReport.totalReturns || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Net Sales:</span>
                  <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '1rem' }}>
                    {fmt(xReport.netSales)}
                  </span>
                </div>
              </div>

              {/* Subtle Divider */}
              <div style={{ borderBottom: '1px dashed #e2e8f0', margin: '14px 0' }} />

              {/* Payment Methods Bubble Heading */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#f0f9ff',
                    color: '#0369a1',
                    border: '1px solid #e0f2fe',
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  Payment Methods
                </span>
              </div>

              {/* Payment Methods List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px' }}>
                {Object.entries(xReport.paymentTotals || {}).map(([method, amount]: [string, any]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{method}:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(amount)}</span>
                  </div>
                ))}
              </div>

              {/* Subtle Divider */}
              <div style={{ borderBottom: '1px dashed #e2e8f0', margin: '14px 0' }} />

              {/* Expected Cash in Drawer Container with Blue Pill Highlight */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '16px',
                  padding: '12px 18px',
                  marginTop: '6px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0369a1' }}>
                  Expected Cash In Drawer:
                </span>
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                  }}
                >
                  {fmt(xReport.expectedCash)}
                </span>
              </div>
            </div>
          ) : step === 'CASH_UP' && xReport ? (
            <div style={{ padding: '8px 0' }}>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Please count the cash in the till (including float) and enter the total below.
              </p>

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                Declared Cash
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  £
                </span>
                <input
                  type="number"
                  style={{
                    width: '100%',
                    fontSize: '1.5rem',
                    paddingLeft: '2.75rem',
                    paddingRight: '1rem',
                    height: '3.75rem',
                    fontWeight: 800,
                    borderRadius: '16px',
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid #edf2f7',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.borderColor = '#c7d2fe';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.borderColor = '#edf2f7';
                    e.target.style.boxShadow = 'none';
                  }}
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
            <div style={{ fontSize: '0.92rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Shift Z-Report</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Z-Report #{zReport.zReportNumber}</p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.86rem',
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  border: '1.5px solid #edf2f7',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Store ID:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{zReport.storeId.slice(0, 8)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cashier:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{zReport.cashierName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opened:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(zReport.openedAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Closed:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(zReport.closedAt).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #e2e8f0', margin: '14px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Starting Float:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(zReport.startingFloat)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Gross Sales:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(zReport.grossSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                  <span style={{ fontWeight: 600 }}>Total Discounts:</span>
                  <span style={{ fontWeight: 700 }}>-{fmt(zReport.totalDiscounts || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                  <span style={{ fontWeight: 600 }}>Total Returns:</span>
                  <span style={{ fontWeight: 700 }}>-{fmt(zReport.totalReturns || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                  <span>Net Sales:</span>
                  <span style={{ color: '#0284c7', fontWeight: 800 }}>{fmt(zReport.netSales)}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #e2e8f0', margin: '14px 0' }} />

              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Payments</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(zReport.paymentTotals || {}).map(([method, amount]: [string, any]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{method}:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(amount)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderBottom: '1px dashed #e2e8f0', margin: '14px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Expected Cash:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(zReport.expectedCash)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Declared Cash:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(zReport.declaredCash)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: zReport.cashDifference < 0 ? '#ef4444' : '#16a34a',
                  }}
                >
                  <span>Difference:</span>
                  <span>{fmt(zReport.cashDifference)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '18px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '12px',
            backgroundColor: '#ffffff',
          }}
        >
          {step === 'X_REPORT' && (
            <>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #edf2f7',
                  color: '#64748b',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#edf2f7';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToCashUp}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5558e6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1';
                }}
              >
                Proceed to Close
              </button>
            </>
          )}
          {step === 'CASH_UP' && (
            <>
              <button
                disabled={loading}
                onClick={() => setStep('X_REPORT')}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #edf2f7',
                  color: '#64748b',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Back
              </button>
              <button
                disabled={loading || declaredCash.trim() === ''}
                onClick={handleCloseShift}
                style={{
                  flex: 1,
                  padding: '11px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: loading || declaredCash.trim() === '' ? 'not-allowed' : 'pointer',
                  opacity: loading || declaredCash.trim() === '' ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Finalize & Close Shift'}
              </button>
            </>
          )}
          {step === 'Z_REPORT' && (
            <button
              onClick={handlePrintAndLogout}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Printer size={18} />
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
