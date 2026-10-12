import { useEffect, useCallback, useState, useRef } from 'react';
import { syncOperations } from '../api/sync.api';
import { getPendingSyncEvents, getFailedSyncEvents, markSyncEventCompleted, markSyncEventFailed, isDesktopApp } from '../services/localDb';
import { useSyncStore } from '../stores/syncStore';

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const deviceId = 'electron-pos'; // This would come from device registration in a real app

  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }

    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');
      const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      if (isLocalhost) {
        // When connected locally to localhost backend, verify actual external internet / cloud access
        try {
          await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
          });
        } catch {
          await fetch('https://1.1.1.1', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
          });
        }
      } else {
        // Check cloud backend reachability
        await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
      }

      clearTimeout(timeoutId);
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
    }
  }, []);

  const handleOnline = useCallback(() => {
    checkConnectivity();
  }, [checkConnectivity]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Perform immediate ping on mount
    checkConnectivity();

    const pingInterval = setInterval(() => {
      checkConnectivity();
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, [handleOnline, handleOffline, checkConnectivity]);

  const fetchPendingCount = useCallback(async () => {
    let count = 0;
    let fCount = 0;
    try {
      if (isDesktopApp()) {
        const pendingDb = await getPendingSyncEvents();
        count += pendingDb.length;
        const failedDb = await getFailedSyncEvents();
        fCount += failedDb.length;
      } else {
        const { events } = useSyncStore.getState();
        count += events.filter((e) => e.status === 'PENDING').length;
        fCount += events.filter((e) => e.status === 'FAILED').length;
      }
      
      setPendingCount(count);
      setFailedCount(fCount);
    } catch (err) {
      console.error('Error fetching pending count', err);
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      let allEvents: any[] = [];
      let dbPending: any[] = [];
      
      if (isDesktopApp()) {
        dbPending = await getPendingSyncEvents();
        allEvents = [...dbPending.map((e: any) => ({
          eventId: e.id,
          eventType: e.type,
          occurredAt: e.createdAt,
          payload: JSON.parse(e.payload),
          source: 'sqlite'
        }))];
      } else {
        const { getPendingEvents } = useSyncStore.getState();
        const webPending = getPendingEvents();
        allEvents = [...webPending.map((e) => ({
          eventId: e.eventId,
          eventType: e.eventType,
          occurredAt: e.occurredAt,
          payload: e.payload,
          source: 'zustand'
        }))];
      }

      if (allEvents.length === 0) {
        setPendingCount(0);
        return;
      }

      const payload = {
        deviceId,
        events: allEvents.map(({ source, ...event }) => {
          if (event.eventType === 'SALE' && !event.payload.payments) {
             event.payload.payments = [{
                paymentMethod: event.payload.paymentMethod || 'CASH',
                amount: event.payload.grandTotal || event.payload.amount || 9999.99 
             }];
             delete event.payload.paymentMethod;
          }
          return event;
        }),
      };

      const response = await syncOperations(payload);

      const successIds = [
        ...response.processed.map((r: any) => r.eventId),
        ...response.alreadyProcessed.map((r: any) => r.eventId),
      ];
      
      for (const id of successIds) {
        // Find which source it belonged to
        const eventItem = allEvents.find(e => e.eventId === id);
        if (eventItem?.source === 'sqlite') {
          await markSyncEventCompleted(id);
        } else if (eventItem?.source === 'zustand') {
          const { removeEvents } = useSyncStore.getState();
          removeEvents([id]);
        }
      }

      // Preserve failed events in queue and mark them FAILED
      if (response.failed && response.failed.length > 0) {
        const firstError = response.failed.map((f: any) => f.error).filter(Boolean).join('; ');
        setSyncError(firstError || 'One or more transactions failed to synchronize.');

        for (const f of response.failed) {
          const eventItem = allEvents.find(e => e.eventId === f.eventId);
          if (eventItem?.source === 'sqlite') {
            await markSyncEventFailed(f.eventId);
          } else if (eventItem?.source === 'zustand') {
            const { updateEventStatus } = useSyncStore.getState();
            updateEventStatus(f.eventId, 'FAILED', f.error);
          }
        }
      } else {
        setSyncError(null);
      }
      
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSyncError(error?.message || 'Sync failed.');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      fetchPendingCount(); // refresh counts
    }
  }, [isOnline, fetchPendingCount]);

  // Auto-sync immediately as soon as internet connection is restored or pending items exist while online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncingRef.current) {
      processSyncQueue();
    }
  }, [isOnline, pendingCount, processSyncQueue]);

  // Poll for queue changes and try syncing if online
  useEffect(() => {
    fetchPendingCount();
    
    const handleQueueUpdate = () => {
      fetchPendingCount();
    };

    window.addEventListener('sync-queue-updated', handleQueueUpdate);

    const interval = setInterval(() => {
      fetchPendingCount();
      if (isOnline) {
        processSyncQueue();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      clearInterval(interval);
    };
  }, [fetchPendingCount, processSyncQueue, isOnline]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncError,
    processSyncQueue,
    checkConnectivity,
  };
};
