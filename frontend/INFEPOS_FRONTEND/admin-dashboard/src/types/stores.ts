export type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Store {
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
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  code: string;
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

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {
  status?: StoreStatus;
}

export interface FindStoresQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StoreStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BackendResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
}
