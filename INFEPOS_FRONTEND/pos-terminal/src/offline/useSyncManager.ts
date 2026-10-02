import { useEffect, useCallback, useState } from 'react';
import { syncOperations } from '../api/sync.api';
import { getPendingSyncEvents, markSyncEventCompleted, isDesktopApp } from '../services/localDb';

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
    if (!isDesktopApp()) return;
    try {
      const pending = await getPendingSyncEvents();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Error fetching pending count', err);
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing || !isDesktopApp()) return;

    try {
      const pending = await getPendingSyncEvents();
      if (pending.length === 0) {
        setPendingCount(0);
        return;
      }

      setIsSyncing(true);

      const payload = {
        deviceId,
        events: pending.map((e: any) => ({
          eventId: e.id,
          eventType: e.type,
          occurredAt: e.createdAt,
          payload: JSON.parse(e.payload),
        })),
      };

      const response = await syncOperations(payload);

      // Mark successful and already processed as COMPLETED
      const successIds = [
        ...response.processed.map((r: any) => r.eventId),
        ...response.alreadyProcessed.map((r: any) => r.eventId),
      ];
      
      for (const id of successIds) {
        await markSyncEventCompleted(id);
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
