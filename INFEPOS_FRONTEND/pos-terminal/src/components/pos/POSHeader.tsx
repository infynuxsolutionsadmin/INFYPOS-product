import React, { useState, useEffect } from 'react';
import { Monitor, User, Store, LogOut, History, FileText, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useNavigate } from 'react-router-dom';
import SalesHistoryModal from './SalesHistoryModal';
import ShiftCloseModal from './ShiftCloseModal';
import { useSyncManager } from '../../offline/useSyncManager';

const POSHeader: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const currentShift = useShiftStore((s) => s.currentShift);
  const clearShift = useShiftStore((s) => s.clearShift);
  const navigate = useNavigate();

  const { isOnline, isSyncing, pendingCount, processSyncQueue } = useSyncManager();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Monitor size={17} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>INFYPOS</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)', lineHeight: 1 }}>POS Terminal</p>
        </div>
      </div>

      {/* Center: Cashier & shift info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
        {/* Cashier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <User size={14} color="var(--pos-text-muted)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--pos-text-muted)' }}>
            <strong style={{ color: 'var(--pos-text)' }}>{cashierName}</strong>
          </span>
        </div>

        {/* Store ID */}
        {user?.storeId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Store size={14} color="var(--pos-text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--pos-text-muted)', fontFamily: 'monospace' }}>
              {user.storeId.slice(0, 8).toUpperCase()}
            </span>
          </div>
        )}

        {/* Shift Status */}
        {currentShift && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
              <span style={{ fontSize: '0.72rem', color: 'var(--pos-text-dim)' }}>since {shiftOpenedAt}</span>
            )}
          </div>
        )}
      </div>

      {/* Right: clock + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        
        {/* Sync Indicator */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.2rem 0.5rem', 
            borderRadius: 8, 
            background: isOnline ? (pendingCount > 0 ? 'var(--pos-warning-light)' : 'transparent') : 'var(--pos-danger-light)',
            border: `1px solid ${isOnline ? (pendingCount > 0 ? 'var(--pos-warning)' : 'transparent') : 'var(--pos-danger)'}`,
            cursor: pendingCount > 0 && isOnline ? 'pointer' : 'default',
          }}
          title={isOnline ? (pendingCount > 0 ? 'Click to sync pending transactions' : 'Online') : 'Offline'}
          onClick={() => { if (pendingCount > 0 && isOnline) processSyncQueue(); }}
        >
          {isSyncing ? (
            <RefreshCcw size={14} className="animate-spin" color="var(--pos-warning)" />
          ) : isOnline ? (
            <Wifi size={14} color={pendingCount > 0 ? "var(--pos-warning)" : "var(--pos-success)"} />
          ) : (
            <WifiOff size={14} color="var(--pos-danger)" />
          )}
          {pendingCount > 0 && (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pos-warning)' }}>
                {pendingCount} Pending
              </span>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const { useSyncStore } = await import('../../stores/syncStore');
                  const { getPendingSyncEvents, markSyncEventCompleted, isDesktopApp } = await import('../../services/localDb');
                  const store = useSyncStore.getState();
                  store.removeEvents(store.events.map((ev: any) => ev.eventId));
                  if (isDesktopApp()) {
                    const events = await getPendingSyncEvents();
                    for (const ev of events) {
                      await markSyncEventCompleted(ev.id);
                    }
                  }
                  window.location.reload();
                }}
                style={{ fontSize: '0.65rem', background: '#ff3333', color: 'white', padding: '2px 6px', borderRadius: '4px', border: 'none', marginLeft: '8px' }}
              >
                Fix Sync
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {timeStr}
          </p>
          <p style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)', lineHeight: 1 }}>{dateStr}</p>
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
          className="btn-pos btn-ghost"
          onClick={handleLogout}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
          title="Sign out"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {isHistoryOpen && (
        <SalesHistoryModal onClose={() => setIsHistoryOpen(false)} />
      )}

      {isCloseShiftOpen && (
        <ShiftCloseModal onClose={() => setIsCloseShiftOpen(false)} />
      )}
    </header>
  );
};

export default POSHeader;
