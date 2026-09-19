// VAT rates from GET /api/v1/settings/vat (hardcoded on backend, read-only)
export interface VatRate {
  code: string;
  name: string;
  rate: number;
}

// Store fields editable via PATCH /api/v1/stores/:id (UpdateStoreDto)
export interface StoreSettings {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string | null;
  currency: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoreSettingsPayload {
  name?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}
