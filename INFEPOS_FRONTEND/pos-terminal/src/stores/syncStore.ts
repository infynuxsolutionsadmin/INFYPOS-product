import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SyncEventType = 'SALE' | 'SALE_RETURN' | 'SHIFT_OPEN' | 'SHIFT_CLOSE';

export interface SyncEventDto {
  eventId: string;
  eventType: SyncEventType;
  occurredAt: string;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string;
}

interface SyncState {
  events: SyncEventDto[];
  deviceId: string;
  addEvent: (eventType: SyncEventType, payload: any) => SyncEventDto;
  removeEvents: (eventIds: string[]) => void;
  updateEventStatus: (eventId: string, status: SyncEventDto['status'], error?: string) => void;
  getPendingEvents: () => SyncEventDto[];
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      events: [],
      deviceId: `device-${generateId()}`,
      addEvent: (eventType, payload) => {
        const event: SyncEventDto = {
          eventId: generateId(),
          eventType,
          occurredAt: new Date().toISOString(),
          payload,
          status: 'PENDING',
        };
        set((state) => ({ events: [...state.events, event] }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('sync-queue-updated'));
        }
        return event;
      },
      removeEvents: (eventIds) => {
        set((state) => ({
          events: state.events.filter((e) => !eventIds.includes(e.eventId)),
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('sync-queue-updated'));
        }
      },
      updateEventStatus: (eventId, status, error) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.eventId === eventId ? { ...e, status, error } : e
          ),
        }));
      },
      getPendingEvents: () => {
        return get().events.filter((e) => e.status === 'PENDING' || e.status === 'FAILED');
      },
    }),
    {
      name: 'pos-sync-storage',
    }
  )
);
