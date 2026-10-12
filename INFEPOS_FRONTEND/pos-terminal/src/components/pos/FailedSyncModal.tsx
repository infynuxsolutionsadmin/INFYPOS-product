import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, Trash2 } from 'lucide-react';
import { getFailedSyncEvents, retryFailedSyncEvent, dismissFailedSyncEvent, isDesktopApp } from '../../services/localDb';
import { useSyncStore } from '../../stores/syncStore';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { getProduct, getProducts } from '../../api/products.api';

interface FailedSyncModalProps {
  onClose: () => void;
}

interface FailedEventItem {
  id: string;
  type: string;
  createdAt: string;
  payload: any;
  error?: string;
  source: 'sqlite' | 'zustand';
}

const FailedSyncModal: React.FC<FailedSyncModalProps> = ({ onClose }) => {
  const user = useAuthStore((s) => s.user);
  const currentShift = useShiftStore((s) => s.currentShift);

  const [failedEvents, setFailedEvents] = useState<FailedEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmReassociateEvent, setConfirmReassociateEvent] = useState<FailedEventItem | null>(null);

  const loadFailedEvents = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const items: FailedEventItem[] = [];

      if (isDesktopApp()) {
        const sqliteFailed = await getFailedSyncEvents();
        for (const row of sqliteFailed) {
          let parsedPayload = {};
          try {
            parsedPayload = JSON.parse(row.payload);
          } catch {
            parsedPayload = {};
          }
          items.push({
            id: row.id,
            type: row.type,
            createdAt: row.createdAt,
            payload: parsedPayload,
            error: row.error || 'Failed to synchronize with server',
            source: 'sqlite',
          });
        }
      } else {
        const { events } = useSyncStore.getState();
        const zustandFailed = events.filter((e) => e.status === 'FAILED');
        for (const e of zustandFailed) {
          items.push({
            id: e.eventId,
            type: e.eventType,
            createdAt: e.occurredAt,
            payload: e.payload,
            error: e.error || 'Failed to synchronize with server',
            source: 'zustand',
          });
        }
      }

      setFailedEvents(items);
    } catch (err: any) {
      console.error('Failed to load failed events:', err);
      setActionError('Could not load failed sync queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFailedEvents();
  }, []);

  const handleRetry = async (event: FailedEventItem, overrideShiftId?: string) => {
    setActionError(null);
    setActionLoadingId(event.id);

    try {
      // 1. Validate Authenticated Store Match
      if (!user?.storeId || event.payload.storeId !== user.storeId) {
        throw new Error(
          `Store mismatch: This sale belongs to store "${event.payload.storeId}", but you are authenticated to store "${user?.storeId || 'None'}". Please switch to the correct store.`
        );
      }

      // 2. Validate Active Shift
      if (!currentShift || currentShift.storeId !== user.storeId || currentShift.status !== 'OPEN') {
        throw new Error(
          'An active OPEN shift for your store is required to recover this transaction. Please open or resume your shift first.'
        );
      }

      // 3. Check Shift Association
      const targetShiftId = overrideShiftId || currentShift.id;
      if (!overrideShiftId && event.payload.shiftId !== currentShift.id) {
        // Needs explicit cashier confirmation to re-associate to current active shift
        setConfirmReassociateEvent(event);
        setActionLoadingId(null);
        return;
      }

      // 4. Validate live product stock before retry
      if (Array.isArray(event.payload.items)) {
        for (const item of event.payload.items) {
          let product: any = null;
          try {
            product = await getProduct(item.productId);
          } catch {
            const productRes = await getProducts({
              search: item.productId,
              limit: 1,
              status: 'ACTIVE',
            });
            product = productRes.items.find((p) => p.id === item.productId);
          }
          if (!product) {
            throw new Error(`Product ID ${item.productId} was not found or is inactive.`);
          }
          const availableStock = product.stockQuantity !== undefined ? product.stockQuantity : 0;
          if (availableStock <= 0) {
            throw new Error(
              `Cannot retry sale: Product "${product.name}" is out of stock in this store. Please adjust inventory first.`
            );
          }
          if (availableStock < item.quantity) {
            throw new Error(
              `Cannot retry sale: Insufficient stock for "${product.name}". Available: ${availableStock}, Required: ${item.quantity}.`
            );
          }
        }
      }

      // 5. Safe Queue Transition
      if (event.source === 'sqlite') {
        await retryFailedSyncEvent(event.id, targetShiftId);
      } else {
        const { updateEventStatus } = useSyncStore.getState();
        // Update shiftId in payload
        event.payload.shiftId = targetShiftId;
        updateEventStatus(event.id, 'PENDING');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('sync-queue-updated'));
        }
      }

      setConfirmReassociateEvent(null);
      await loadFailedEvents();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to retry transaction.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = async (event: FailedEventItem) => {
    if (!window.confirm(`Are you sure you want to dismiss failed transaction ${event.id}? It will be removed from retry processing.`)) {
      return;
    }

    setActionLoadingId(event.id);
    try {
      if (event.source === 'sqlite') {
        await dismissFailedSyncEvent(event.id);
      } else {
        const { removeEvents } = useSyncStore.getState();
        removeEvents([event.id]);
      }
      await loadFailedEvents();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to dismiss event.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fmt = (n: number) => `£${Number(n || 0).toFixed(2)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 60,
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
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} color="#DC2626" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Failed Sync Recovery
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Review and safely recover transactions that failed server synchronization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              background: '#FEE2E2',
              borderBottom: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Re-association Confirmation Dialog */}
        {confirmReassociateEvent && (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: '#EFF6FF',
              borderBottom: '1px solid #BFDBFE',
              color: '#1E3A8A',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <ArrowRight size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1E40AF' }}>
                  Shift Re-association Required
                </strong>
                The original shift associated with this sale (
                <code style={{ background: '#DBEAFE', padding: '1px 4px', borderRadius: 4 }}>
                  {confirmReassociateEvent.payload.shiftId || 'None'}
                </code>
                ) belongs to another store or is no longer open.
                <br />
                Do you confirm attaching this sale to your active shift (
                <code style={{ background: '#DBEAFE', padding: '1px 4px', borderRadius: 4 }}>
                  {currentShift?.id}
                </code>
                )?
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-pos btn-ghost"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setConfirmReassociateEvent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-pos btn-primary"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: '#2563EB' }}
                onClick={() => handleRetry(confirmReassociateEvent, currentShift?.id)}
              >
                Confirm & Retry With Active Shift
              </button>
            </div>
          </div>
        )}

        {/* Content List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Loading failed transactions...
            </div>
          ) : failedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              <CheckCircle2 size={40} color="#16A34A" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.25rem' }}>
                No Failed Transactions
              </h3>
              <p style={{ fontSize: '0.85rem' }}>All transactions have synchronized successfully or been processed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {failedEvents.map((evt) => {
                const totalAmount =
                  evt.payload.payments?.[0]?.amount ||
                  evt.payload.grandTotal ||
                  evt.payload.items?.reduce((acc: number, i: any) => acc + (i.lineTotal || 0), 0) ||
                  0;
                const itemCount = evt.payload.items?.length || 0;
                const isOperating = actionLoadingId === evt.id;

                return (
                  <div
                    key={evt.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '1rem',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E293B' }}>
                            {evt.type} #{evt.id.slice(0, 10)}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: '#FEE2E2',
                              color: '#DC2626',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            FAILED
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {new Date(evt.createdAt).toLocaleString()} · Store: {evt.payload.storeId?.slice(0, 8)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>
                          {fmt(totalAmount)}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>

                    {/* Error Banner */}
                    <div
                      style={{
                        background: '#FFF1F2',
                        border: '1px solid #FFE4E6',
                        borderRadius: 8,
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.78rem',
                        color: '#BE123C',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{evt.error || 'Server rejected synchronization.'}</span>
                    </div>

                    {/* Items snippet */}
                    {Array.isArray(evt.payload.items) && evt.payload.items.length > 0 && (
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 6,
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.75rem',
                          color: '#475569',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {evt.payload.items.map((it: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              {it.productName || it.productId} × {it.quantity}
                            </span>
                            <span>{fmt(it.lineTotal || (it.unitPrice || 0) * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-pos btn-ghost"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#DC2626' }}
                        disabled={isOperating}
                        onClick={() => handleDismiss(evt)}
                      >
                        <Trash2 size={13} />
                        Dismiss
                      </button>
                      <button
                        type="button"
                        className="btn-pos btn-primary"
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                        disabled={isOperating}
                        onClick={() => handleRetry(evt)}
                      >
                        {isOperating ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Review & Retry
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Retries are verified against active store shift and current inventory.
          </span>
          <button
            type="button"
            className="btn-pos btn-ghost"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedSyncModal;
