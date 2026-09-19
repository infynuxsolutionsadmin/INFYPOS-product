import client from './client';
import type { VatRate, UpdateStoreSettingsPayload } from '../types/settings';
import type { BackendResponse } from '../types/inventory';
import type { Store } from '../types/stores';

// GET /api/v1/settings/vat — hardcoded VAT rates, read-only
// Permission: settings.read
export const getVatSettings = async (): Promise<VatRate[]> => {
  const r = await client.get<BackendResponse<VatRate[]>>('/settings/vat');
  return r.data.data;
};

// GET /api/v1/stores/:id — read a single store's configuration
// Permission: stores.read
export const getStoreSettings = async (storeId: string): Promise<Store> => {
  const r = await client.get<BackendResponse<Store>>(`/stores/${storeId}`);
  return r.data.data;
};

// PATCH /api/v1/stores/:id — update store configuration (not status or code — those need separate consideration)
// Permission: stores.update
export const updateStoreSettings = async (storeId: string, payload: UpdateStoreSettingsPayload): Promise<Store> => {
  const r = await client.patch<BackendResponse<Store>>(`/stores/${storeId}`, payload);
  return r.data.data;
};
