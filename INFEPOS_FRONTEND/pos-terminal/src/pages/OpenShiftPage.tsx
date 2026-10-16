import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, AlertCircle, Loader2, Clock, Info, PlayCircle, History, LogOut } from 'lucide-react';
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
        if (mounted) {
          if (shift && user?.storeId && shift.storeId === user.storeId) {
            setActiveShift(shift);
          } else {
            setActiveShift(null);
            // Clear any stale local shift belonging to another store
            const currentShift = useShiftStore.getState().currentShift;
            if (currentShift && currentShift.storeId !== user?.storeId) {
              useShiftStore.getState().clearShift();
            }
          }
        }
      } catch (err) {
        console.error('Failed to check active shift', err);
      } finally {
        if (mounted) setCheckingActive(false);
      }
    };
    checkShift();
    return () => { mounted = false; };
  }, [user?.storeId]);

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

  // Dedicated Resume Shift view matching reference design exactly
  if (activeShift) {
    const openerName = activeShift.openedBy
      ? `${activeShift.openedBy.firstName || ''}${activeShift.openedBy.lastName ? ' ' + activeShift.openedBy.lastName : ''}`.trim() || 'Cashier'
      : 'Cashier';

    return (
      <div
        className="resume-shift-wrapper"
        style={{
          height: '100%',
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: '#FFFFFF',
          padding: 'clamp(1rem, 2.5vh, 2rem) clamp(0.75rem, 3vw, 1.5rem) clamp(1.5rem, 3.5vh, 2.5rem)',
          fontFamily: 'inherit',
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 'min(490px, 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: 'auto',
            paddingTop: '0.25rem',
            paddingBottom: '0.5rem',
            boxSizing: 'border-box',
          }}
        >
          {/* Header Section */}
          <div
            className="resume-shift-header"
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(1rem, 2.5vh, 1.75rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Top Clock Bubble */}
            {/* <div
              className="resume-clock-bubble"
              style={{
                width: 'clamp(46px, 6vh, 56px)',
                height: 'clamp(46px, 6vh, 56px)',
                borderRadius: '50%',
                backgroundColor: '#eff1fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'clamp(0.6rem, 1.5vh, 1rem)',
                flexShrink: 0,
              }}
            >
              <Clock size={26} color="#4338ca" strokeWidth={2.2} />
            </div> */}

            {/* Date and Time Pill */}
            <div
              className="resume-time-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                backgroundColor: '#eff2fe',
                borderRadius: '9999px',
                padding: 'clamp(0.35rem, 0.8vh, 0.45rem) clamp(0.75rem, 2vw, 1.15rem)',
                marginBottom: 'clamp(0.75rem, 1.5vh, 1.15rem)',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <Clock size={15} color="#4338ca" strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span
                style={{
                  color: '#4338ca',
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.825rem)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {dateStr} · {timeStr}
              </span>
            </div>

            {/* Heading */}
            <h1
              className="resume-title"
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 1.95rem)',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.025em',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Resume Shift
            </h1>

            {/* Welcome Subtitle */}
            <p
              style={{
                color: '#64748b',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                marginTop: '0.35rem',
                marginBottom: 0,
              }}
            >
              Welcome back, <strong style={{ color: '#0f172a', fontWeight: 800 }}>{cashierName}</strong>
            </p>
          </div>

          {/* Main Bubble Card */}
          <div
            className="resume-card"
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '28px',
              padding: 'clamp(1.25rem, 2.5vh, 2rem) clamp(1rem, 3vw, 1.85rem)',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08), 0 4px 18px rgba(0, 0, 0, 0.02)',
              border: '1px solid #f1f5f9',
              boxSizing: 'border-box',
            }}
          >
            {/* Information Panel */}
            <div
              className="resume-info-panel"
              style={{
                backgroundColor: '#f5f6ff',
                borderRadius: '20px',
                padding: 'clamp(1rem, 2vh, 1.35rem) clamp(0.85rem, 2.5vw, 1.35rem)',
                marginBottom: 'clamp(1rem, 2.2vh, 1.5rem)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: 'clamp(0.85rem, 1.8vh, 1.15rem)' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <History size={18} color="#3b5bfd" strokeWidth={2.2} />
                </div>
                <span style={{ color: '#3b5bfd', fontWeight: 700, fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.3 }}>
                  An active shift is already open.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.65rem, 1.5vh, 0.85rem)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <span style={{ color: '#64748b', fontSize: 'clamp(0.8rem, 1.8vw, 0.875rem)', fontWeight: 500 }}>Opened by:</span>
                  <span
                    style={{
                      backgroundColor: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: 'clamp(0.75rem, 1.8vw, 0.825rem)',
                      fontWeight: 600,
                      padding: '0.2rem 0.75rem',
                      borderRadius: '9999px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {openerName}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <span style={{ color: '#64748b', fontSize: 'clamp(0.8rem, 1.8vw, 0.875rem)', fontWeight: 500 }}>Opened at:</span>
                  <span style={{ color: '#0f172a', fontSize: 'clamp(0.8rem, 1.8vw, 0.875rem)', fontWeight: 700, wordBreak: 'break-word', textAlign: 'right' }}>
                    {new Date(activeShift.openedAt).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <span style={{ color: '#64748b', fontSize: 'clamp(0.8rem, 1.8vw, 0.875rem)', fontWeight: 500 }}>Starting Float:</span>
                  <span style={{ color: '#0f172a', fontSize: 'clamp(0.85rem, 2vw, 0.925rem)', fontWeight: 700 }}>
                    £{Number(activeShift.startingFloat).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <button
              type="button"
              onClick={handleResume}
              style={{
                width: '100%',
                padding: 'clamp(0.8rem, 1.8vh, 0.95rem) 1.25rem',
                minHeight: '44px',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #4338ca 0%, #4f46e5 35%, #6366f1 70%, #7c3aed 100%)',
                color: '#ffffff',
                fontSize: 'clamp(0.925rem, 2vw, 1rem)',
                fontWeight: 700,
                border: 'none',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.32), 0 2px 6px rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                cursor: 'pointer',
                marginBottom: 'clamp(0.6rem, 1.4vh, 0.85rem)',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(79, 70, 229, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.32)';
              }}
            >
              <PlayCircle size={20} color="#ffffff" strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span>Resume Shift</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: 'clamp(0.72rem, 1.6vh, 0.85rem) 1.25rem',
                minHeight: '44px',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: 'clamp(0.85rem, 1.8vw, 0.925rem)',
                fontWeight: 600,
                border: '1.5px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f8faff';
                e.currentTarget.style.borderColor = '#c7d2fe';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e0e7ff';
              }}
            >
              <LogOut size={18} color="#64748b" strokeWidth={2} style={{ flexShrink: 0 }} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: 'var(--pos-bg)',
        padding: 'clamp(0.75rem, 3vh, 2rem) clamp(0.75rem, 3vw, 1.5rem)',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
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

      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 'min(480px, 100%)',
          margin: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          paddingTop: '0.25rem',
          paddingBottom: '0.5rem',
        }}
      >
        {/* Header strip */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 2.5vh, 2rem)', width: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              marginBottom: 'clamp(0.35rem, 1vh, 0.5rem)',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Clock size={16} color="var(--pos-text-muted)" style={{ flexShrink: 0 }} />
            <span
              style={{
                color: 'var(--pos-text-muted)',
                fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {dateStr} · {timeStr}
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.25rem, 3.2vw, 1.5rem)',
              fontWeight: 800,
              color: 'var(--pos-text)',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Open Your Shift
          </h1>
          <p
            style={{
              color: 'var(--pos-text-muted)',
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              marginTop: '0.35rem',
              marginBottom: 0,
            }}
          >
            Welcome back, <strong style={{ color: 'var(--pos-text)' }}>{cashierName}</strong>
          </p>
        </div>

        <div
          className="pos-card"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 'clamp(1.25rem, 2.8vh, 2rem) clamp(1rem, 3.5vw, 2rem)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {checkingActive ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(1.5rem, 3vh, 2rem) 0',
              }}
            >
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--pos-accent)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--pos-text-muted)', fontSize: 'clamp(0.85rem, 1.8vw, 0.9rem)' }}>Checking for active shift...</p>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'clamp(0.45rem, 1.5vw, 0.6rem)',
                  background: 'var(--pos-accent-light)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 10,
                  padding: 'clamp(0.6rem, 1.5vh, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
                  marginBottom: 'clamp(1rem, 2vh, 1.5rem)',
                  color: '#a5b4fc',
                  fontSize: 'clamp(0.785rem, 1.8vw, 0.85rem)',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ wordBreak: 'break-word' }}>Count the cash in your drawer and enter the starting float amount below.</span>
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'clamp(0.45rem, 1.5vw, 0.6rem)',
                    background: 'var(--pos-danger-light)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 10,
                    padding: 'clamp(0.6rem, 1.5vh, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
                    marginBottom: 'clamp(1rem, 2vh, 1.25rem)',
                    color: '#fca5a5',
                    fontSize: 'clamp(0.8rem, 1.8vw, 0.875rem)',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ wordBreak: 'break-word' }}>{error}</span>
                </div>
              )}

              {/* Float input */}
              <div style={{ marginBottom: 'clamp(1rem, 2vh, 1.5rem)', width: '100%' }}>
                <label
                  htmlFor="starting-float"
                  style={{
                    display: 'block',
                    fontSize: 'clamp(0.75rem, 1.6vw, 0.8rem)',
                    fontWeight: 600,
                    color: 'var(--pos-text-muted)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Starting Float (£)
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 'clamp(0.85rem, 2vw, 1rem)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--pos-text-muted)',
                      pointerEvents: 'none',
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
                    style={{
                      paddingLeft: 'clamp(2.5rem, 5vw, 2.75rem)',
                      paddingRight: 'clamp(0.75rem, 2vw, 1rem)',
                      paddingTop: 'clamp(0.65rem, 1.5vh, 0.75rem)',
                      paddingBottom: 'clamp(0.65rem, 1.5vh, 0.75rem)',
                      fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: '44px',
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick float buttons */}
              <div style={{ marginBottom: 'clamp(1.15rem, 2.2vh, 1.5rem)', width: '100%' }}>
                <p
                  style={{
                    fontSize: 'clamp(0.7rem, 1.6vw, 0.75rem)',
                    color: 'var(--pos-text-dim)',
                    marginBottom: '0.5rem',
                    fontWeight: 500,
                  }}
                >
                  Quick Amount
                </p>
                <div
                  className="grid grid-cols-3 sm:grid-cols-6 gap-2"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {[0, 50, 100, 150, 200, 300].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn-pos btn-ghost"
                      style={{
                        width: '100%',
                        padding: 'clamp(0.45rem, 1vh, 0.5rem) clamp(0.35rem, 1vw, 0.85rem)',
                        fontSize: 'clamp(0.775rem, 1.8vw, 0.85rem)',
                        minHeight: '38px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
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
                style={{
                  width: '100%',
                  padding: 'clamp(0.85rem, 1.8vh, 1rem) 1.25rem',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: 700,
                  minHeight: '44px',
                  marginBottom: 'clamp(0.5rem, 1.2vh, 0.75rem)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxSizing: 'border-box',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    <span>Opening Shift…</span>
                  </>
                ) : (
                  <span>✓ Open Shift &amp; Start Trading</span>
                )}
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-pos btn-ghost"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 'clamp(0.65rem, 1.5vh, 0.75rem) 1.25rem',
              fontSize: 'clamp(0.825rem, 1.8vw, 0.9rem)',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenShiftPage;
