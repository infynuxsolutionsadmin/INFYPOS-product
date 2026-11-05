import React, { useState, useEffect } from 'react';
import { User, Store, History, FileText, Wifi, WifiOff, RefreshCcw, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useNavigate } from 'react-router-dom';
import SalesHistoryModal from './SalesHistoryModal';
import ShiftCloseModal from './ShiftCloseModal';
import FailedSyncModal from './FailedSyncModal';
import ManagerReauthModal from './ManagerReauthModal';
import { useSyncManager } from '../../offline/useSyncManager';
import logoImg from '../../assets/transparent_logo.png';

const POSHeader: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const currentShift = useShiftStore((s) => s.currentShift);
  const clearShift = useShiftStore((s) => s.clearShift);
  const navigate = useNavigate();

  const { isOnline, isSyncing, pendingCount, failedCount, syncError, isAuthExpired, processSyncQueue, checkConnectivity } = useSyncManager();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [isFailedSyncOpen, setIsFailedSyncOpen] = useState(false);
  const [isReauthOpen, setIsReauthOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuth();
    clearShift();
    navigate('/login', { replace: true });
  };

  const cashierName = user ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'Cashier';

  const timeStr = currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const shiftOpenedAt = currentShift?.openedAt
    ? new Date(currentShift.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header
      className="pos-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        height: 56,
        background: 'var(--pos-surface)',
        borderBottom: '1px solid var(--pos-border)',
        flexShrink: 0,
        gap: '1rem',
      }}
    >
      {/* Left: Logo */}
      <div className="pos-header-logo-group" style={{ display: 'flex', alignItems: 'center', gap: '0', flexShrink: 0 }}>
        <div
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '0.45rem'
          }}
        >
          <img src={logoImg} alt="INFEPOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>INFEPOS</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)', lineHeight: 1 }}>POS Terminal</p>
        </div>
      </div>

      {/* Center: Cashier & shift info */}
      <div className="pos-header-center-info" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
        {/* Cashier */}
        <div className="pos-header-cashier" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <User size={14} color="var(--pos-text-muted)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--pos-text-muted)' }}>
            <strong style={{ color: 'var(--pos-text)' }}>{cashierName}</strong>
          </span>
        </div>

        {/* Store ID */}
        {user?.storeId && (
          <div className="pos-header-store" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Store size={14} color="var(--pos-text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--pos-text-muted)', fontFamily: 'monospace' }}>
              {user.storeId.slice(0, 8).toUpperCase()}
            </span>
          </div>
        )}

        {/* Shift Status */}
        {currentShift && (
          <div className="pos-header-shift" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div
              className="pulse-green"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--pos-success)',
              }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--pos-success)', fontWeight: 600 }}>
              Shift Open
            </span>
            {shiftOpenedAt && (
              <span className="pos-header-shift-time" style={{ fontSize: '0.72rem', color: 'var(--pos-text-dim)' }}>since {shiftOpenedAt}</span>
            )}
          </div>
        )}
      </div>

      {/* Right: clock + logout */}
      <div className="pos-header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        
        {/* Sync Indicator */}
        <div 
          className="pos-header-sync"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.25rem 0.6rem', 
            borderRadius: 8, 
            background: isOnline ? (pendingCount > 0 ? 'var(--pos-warning-light)' : 'transparent') : 'var(--pos-danger-light)',
            border: `1px solid ${isOnline ? (pendingCount > 0 ? 'var(--pos-warning)' : 'transparent') : 'var(--pos-danger)'}`,
            cursor: pendingCount > 0 && isOnline ? 'pointer' : 'default',
          }}
          title={isOnline ? (pendingCount > 0 ? 'Click to sync pending transactions' : 'Online') : 'Offline (No internet or cloud connection)'}
          onClick={() => { if (pendingCount > 0 && isOnline) processSyncQueue(); }}
        >
          {isSyncing ? (
            <RefreshCcw size={14} className="animate-spin" color="var(--pos-warning)" />
          ) : isOnline ? (
            <Wifi size={14} color={pendingCount > 0 ? "var(--pos-warning)" : "var(--pos-success)"} />
          ) : (
            <WifiOff size={14} color="var(--pos-danger)" />
          )}

          {!isOnline && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pos-danger)' }}>
              Offline
            </span>
          )}

          {isAuthExpired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid #eab308',
                color: '#eab308',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '6px',
              }}
              title="Cloud sync session expired. Click to enter Manager credentials and reconnect."
              onClick={(e) => {
                e.stopPropagation();
                setIsReauthOpen(true);
              }}
            >
              <ShieldAlert size={13} color="#eab308" />
              <span>Auth Required</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReauthOpen(true);
                }}
                style={{
                  fontSize: '0.65rem',
                  background: '#eab308',
                  color: '#000',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  border: 'none',
                  marginLeft: '4px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Re-authorize
              </button>
            </div>
          )}

          {pendingCount > 0 && !isAuthExpired && (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pos-warning)' }}>
                {isOnline ? `${pendingCount} Pending` : `(${pendingCount} Pending)`}
              </span>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isAuthExpired) {
                    setIsReauthOpen(true);
                    return;
                  }
                  if (isOnline) {
                    processSyncQueue();
                  } else {
                    checkConnectivity();
                    alert(`Offline Mode: You have ${pendingCount} transaction(s) saved safely in local memory. They will sync automatically once internet connectivity is restored.`);
                  }
                }}
                style={{ 
                  fontSize: '0.65rem', 
                  background: isOnline ? 'var(--pos-warning)' : '#4b5563', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  border: 'none', 
                  marginLeft: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title={isOnline ? 'Sync pending transactions now' : 'View offline sync status'}
              >
                {isOnline ? 'Sync Now' : 'Info'}
              </button>
            </>
          )}

          {failedCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '4px',
              }}
              title={syncError || `${failedCount} transactions failed to sync. Click to review and recover.`}
              onClick={(e) => {
                e.stopPropagation();
                setIsFailedSyncOpen(true);
              }}
            >
              <AlertCircle size={12} color="#ef4444" />
              <span>{failedCount} Sync Failed</span>
            </div>
          )}
        </div>

        <div className="pos-header-clock" style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {timeStr}
          </p>
          <p className="pos-header-date" style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)', lineHeight: 1 }}>{dateStr}</p>
        </div>

        <button
          id="btn-pos-history"
          type="button"
          className="btn-pos btn-ghost"
          onClick={() => setIsHistoryOpen(true)}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
          title="Sales History"
        >
          <History size={14} />
          History
        </button>

        <button
          id="btn-pos-close-shift"
          type="button"
          className="btn-pos"
          onClick={() => setIsCloseShiftOpen(true)}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem', background: 'var(--pos-danger)', color: '#fff' }}
          title="Close Shift"
        >
          <FileText size={14} />
          Close Shift
        </button>

        <button
          id="btn-pos-logout"
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 0.4rem',
            transition: 'transform 0.15s ease',
          }}
          title="Exit Terminal"
        >
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#374151', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Exit
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: '#ffffff',
              boxShadow: '3px 3px 10px rgba(163,177,198,0.25), -3px -3px 10px rgba(255,255,255,0.95)',
              border: '1px solid rgba(0,0,0,0.04)',
              color: '#374151',
              transition: 'all 0.2s ease',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
        </button>
      </div>

      {isHistoryOpen && (
        <SalesHistoryModal onClose={() => setIsHistoryOpen(false)} />
      )}

      {isCloseShiftOpen && (
        <ShiftCloseModal onClose={() => setIsCloseShiftOpen(false)} />
      )}

      {isFailedSyncOpen && (
        <FailedSyncModal onClose={() => setIsFailedSyncOpen(false)} />
      )}

      {isReauthOpen && (
        <ManagerReauthModal
          onClose={() => setIsReauthOpen(false)}
          onSuccess={() => {
            setIsReauthOpen(false);
            processSyncQueue();
          }}
        />
      )}
    </header>
  );
};

export default POSHeader;
