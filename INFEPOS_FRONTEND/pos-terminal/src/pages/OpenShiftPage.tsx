import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, AlertCircle, Loader2, Clock, Info, PlayCircle } from 'lucide-react';
import { openShift, getActiveShift } from '../api/shifts.api';
import type { Shift } from '../types/shift';
import { useShiftStore } from '../stores/shiftStore';
import { useAuthStore } from '../stores/authStore';

const OpenShiftPage: React.FC = () => {
  const navigate = useNavigate();
  const setShift = useShiftStore((s) => s.setShift);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [float, setFloat] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkShift = async () => {
      try {
        const shift = await getActiveShift();
        if (mounted && shift) {
          setActiveShift(shift);
        }
      } catch (err) {
        console.error('Failed to check active shift', err);
      } finally {
        if (mounted) setCheckingActive(false);
      }
    };
    checkShift();
    return () => { mounted = false; };
  }, []);

  const cashierName = user
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : 'Cashier';

  const handleFloatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numeric input with up to 2 decimal places
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setFloat(val);
      if (error) setError(null);
    }
  };

  const handleOpen = async () => {
    const amount = parseFloat(float);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid starting float (£0.00 or more)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shift = await openShift({ startingFloat: amount });
      setShift(shift);
      navigate('/pos', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not open shift. Please try again.';
      // 409 = conflict — a shift is already open
      if (err?.response?.status === 409) {
        setError('A shift is already open for this store. Contact your manager.');
      } else if (err?.response?.status === 403) {
        setError('You do not have permission to open a shift (shifts.open).');
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResume = () => {
    if (activeShift) {
      setShift(activeShift);
      navigate('/pos', { replace: true });
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pos-bg)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.07) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(34,197,94,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>
        {/* Header strip */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={16} color="var(--pos-text-muted)" />
            <span style={{ color: 'var(--pos-text-muted)', fontSize: '0.85rem' }}>
              {dateStr} · {timeStr}
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--pos-text)', letterSpacing: '-0.02em' }}>
            {activeShift ? 'Resume Shift' : 'Open Your Shift'}
          </h1>
          <p style={{ color: 'var(--pos-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Welcome back, <strong style={{ color: 'var(--pos-text)' }}>{cashierName}</strong>
          </p>
        </div>

        <div className="pos-card" style={{ padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {checkingActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pos-accent)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--pos-text-muted)' }}>Checking for active shift...</p>
            </div>
          ) : activeShift ? (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  background: 'var(--pos-accent-light)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 10,
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  color: 'var(--pos-text)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', gap: '0.6rem', color: '#a5b4fc', marginBottom: '0.5rem' }}>
                  <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontWeight: 600 }}>An active shift is already open.</span>
                </div>
                <div style={{ paddingLeft: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--pos-text-muted)' }}>Opened by:</span>
                    <span style={{ fontWeight: 600 }}>{activeShift.openedBy?.firstName} {activeShift.openedBy?.lastName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--pos-text-muted)' }}>Opened at:</span>
                    <span style={{ fontWeight: 600 }}>{new Date(activeShift.openedAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-text-muted)' }}>Starting Float:</span>
                    <span style={{ fontWeight: 600 }}>£{Number(activeShift.startingFloat).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-pos btn-primary"
                onClick={handleResume}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
              >
                <PlayCircle size={20} />
                Resume Shift
              </button>
            </>
          ) : (
            <>
              {/* Info banner */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  background: 'var(--pos-accent-light)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  color: '#a5b4fc',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Count the cash in your drawer and enter the starting float amount below.</span>
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    background: 'var(--pos-danger-light)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 10,
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Float input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="starting-float"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pos-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Starting Float (£)
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--pos-text-muted)',
                    }}
                  >
                    <DollarSign size={18} />
                  </div>
                  <input
                    id="starting-float"
                    type="text"
                    inputMode="decimal"
                    className="pos-input"
                    placeholder="0.00"
                    value={float}
                    onChange={handleFloatChange}
                    style={{ paddingLeft: '2.75rem', fontSize: '1.5rem', fontWeight: 700 }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick float buttons */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--pos-text-dim)', marginBottom: '0.5rem', fontWeight: 500 }}>Quick Amount</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[0, 50, 100, 150, 200, 300].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn-pos btn-ghost"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setFloat(amt.toFixed(2));
                        if (error) setError(null);
                      }}
                    >
                      £{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="btn-open-shift"
                type="button"
                className="btn-pos btn-success"
                onClick={handleOpen}
                disabled={loading}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '0.75rem' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                    Opening Shift…
                  </>
                ) : (
                  '✓ Open Shift & Start Trading'
                )}
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-pos btn-ghost"
            onClick={handleLogout}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenShiftPage;
