import { useEffect, useCallback, useState } from 'react';
import { syncOperations } from '../api/sync.api';
import { getPendingSyncEvents, markSyncEventCompleted, isDesktopApp } from '../services/localDb';
import { useSyncStore } from '../stores/syncStore';

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const deviceId = 'electron-pos'; // This would come from device registration in a real app

  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const fetchPendingCount = useCallback(async () => {
    let count = 0;
    try {
      if (isDesktopApp()) {
        const pendingDb = await getPendingSyncEvents();
        count += pendingDb.length;
      }
      
      const { getPendingEvents } = useSyncStore.getState();
      count += getPendingEvents().length;
      
      setPendingCount(count);
    } catch (err) {
      console.error('Error fetching pending count', err);
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
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
      }

      const { getPendingEvents, updateEventStatus } = useSyncStore.getState();
      const webPending = getPendingEvents();
      allEvents = [...allEvents, ...webPending.map((e) => ({
        eventId: e.eventId,
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        payload: e.payload,
        source: 'zustand'
      }))];

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
          updateEventStatus(id, 'COMPLETED');
        }
      }
      
    } catch (error: any) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
      fetchPendingCount(); // refresh count
    }
  }, [isOnline, isSyncing, fetchPendingCount]);

  // Poll for queue changes and try syncing if online
  useEffect(() => {
    fetchPendingCount();
    
    const interval = setInterval(() => {
      fetchPendingCount();
      if (navigator.onLine) {
        processSyncQueue();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [fetchPendingCount, processSyncQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    processSyncQueue,
  };
};
