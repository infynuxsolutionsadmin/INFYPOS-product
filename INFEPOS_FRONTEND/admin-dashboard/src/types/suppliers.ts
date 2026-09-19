export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
  id: string;
  tenantId: string;
  supplierCode: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxRegistrationNumber: string | null;
  paymentTerms: string | null;
  creditLimit: string | number | null;
  notes: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  supplierCode: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxRegistrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateSupplierRequest {
  supplierCode?: string;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxRegistrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
  status?: SupplierStatus;
}

export interface FindSuppliersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierStatus;
  city?: string;
  paymentTerms?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
