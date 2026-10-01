import client from './client';
import type { SyncEventDto } from '../stores/syncStore';

interface SyncPayload {
  deviceId: string;
  events: Omit<SyncEventDto, 'status' | 'error'>[];
}

interface SyncResponse {
  success: boolean;
  processed: { eventId: string; status: string }[];
  alreadyProcessed: { eventId: string; status: string }[];
  failed: { eventId: string; status: string; error: string }[];
}

export const syncOperations = async (payload: SyncPayload): Promise<SyncResponse> => {
  const response = await client.post<SyncResponse>('/sync', payload);
  return response.data; // Note: sync response structure is directly returned by controller
};
