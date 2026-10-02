import { useEffect, useState } from 'react';
import { getPendingSyncEvents, markSyncEventCompleted, isDesktopApp } from '../services/localDb';
import { syncOperations } from '../api/sync.api';

export const useSyncWorker = (intervalMs = 10000) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktopApp()) return;

    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const runSync = async () => {
      try {
        const events = await getPendingSyncEvents();
        if (!mounted) return;

        setPendingCount(events.length);
        
        if (events.length === 0) {
          setSyncError(null);
          return;
        }

        setIsSyncing(true);

        // Format events for the backend
        const formattedEvents = events.map((ev: any) => ({
          eventId: ev.id,
          eventType: ev.type,
          payload: JSON.parse(ev.payload),
        }));

        const result = await syncOperations({
          deviceId: 'electron-pos', // In production, this would be a real device ID
          events: formattedEvents,
        });

        // Mark successfully processed events in the local DB
        for (const item of result.processed) {
          await markSyncEventCompleted(item.eventId);
        }
        for (const item of result.alreadyProcessed) {
          await markSyncEventCompleted(item.eventId);
        }

        if (mounted) {
          setSyncError(null);
          // Re-fetch remaining count
          const remaining = await getPendingSyncEvents();
          setPendingCount(remaining.length);
        }

      } catch (err: any) {
        if (mounted) {
          // Typically means network is down
          setSyncError(err.message || 'Sync failed');
        }
      } finally {
        if (mounted) {
          setIsSyncing(false);
          // Schedule next run
          timeoutId = setTimeout(runSync, intervalMs);
        }
      }
    };

    runSync();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [intervalMs]);

  return { pendingCount, isSyncing, syncError };
};
