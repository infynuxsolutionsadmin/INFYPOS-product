import { useEffect, useCallback, useState } from 'react';
import { useSyncStore } from '../stores/syncStore';
import { syncOperations } from '../api/sync.api';

export const useSyncManager = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const { events, deviceId, updateEventStatus, removeEvents, getPendingEvents } = useSyncStore();

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

  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pending = getPendingEvents();
    if (pending.length === 0) return;

    setIsSyncing(true);

    // Mark as SYNCING
    pending.forEach((e) => updateEventStatus(e.eventId, 'SYNCING'));

    const payload = {
      deviceId,
      events: pending.map((e) => ({
        eventId: e.eventId,
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        payload: e.payload,
      })),
    };

    try {
      const response = await syncOperations(payload);

      // Remove successful and already processed
      const successIds = [
        ...response.processed.map((r) => r.eventId),
        ...response.alreadyProcessed.map((r) => r.eventId),
      ];
      if (successIds.length > 0) {
        removeEvents(successIds);
      }

      // Mark failed
      response.failed.forEach((f) => {
        updateEventStatus(f.eventId, 'FAILED', f.error);
      });
    } catch (error: any) {
      // Revert to FAILED if network call itself fails
      pending.forEach((e) => {
        updateEventStatus(e.eventId, 'FAILED', error?.message || 'Network error during sync');
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, deviceId, getPendingEvents, updateEventStatus, removeEvents]);

  // Attempt sync when coming back online or when events change
  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue, events.length]);

  return {
    isOnline,
    isSyncing,
    pendingCount: getPendingEvents().length,
    processSyncQueue,
  };
};
