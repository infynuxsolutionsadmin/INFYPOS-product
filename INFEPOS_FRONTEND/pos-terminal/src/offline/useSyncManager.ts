import { useEffect, useCallback, useState, useRef } from 'react';
import { syncOperations } from '../api/sync.api';
import { getPendingSyncEvents, markSyncEventCompleted, isDesktopApp } from '../services/localDb';
import { useSyncStore } from '../stores/syncStore';

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
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
    try {
      if (isDesktopApp()) {
        const pendingDb = await getPendingSyncEvents();
        count += pendingDb.length;
      } else {
        const { getPendingEvents } = useSyncStore.getState();
        count += getPendingEvents().length;
      }
      
      setPendingCount(count);
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
        ...response.failed.map((r: any) => r.eventId), // Also remove permanently failed events from queue
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
      
    } catch (error: any) {
      console.error('Sync failed:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      fetchPendingCount(); // refresh count
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
    processSyncQueue,
    checkConnectivity,
  };
};
