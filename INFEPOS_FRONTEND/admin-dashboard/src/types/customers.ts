export type CustomerType = 'RETAIL' | 'WHOLESALE';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type CustomerTier = 'STANDARD' | 'GOLD' | 'PLATINUM'; // Guessed from context, but backend handles it

export interface Customer {
  id: string;
  tenantId: string;
  customerCode: string;
  customerType: CustomerType;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  dob: string | null;
  gender: string | null;
  gstNumber: string | null;
  creditLimit: string | number | null;
  outstandingBalance: string | number;
  currentPoints: number;
  lifetimePoints: number;
  tier: CustomerTier;
  marketingOptIn: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  customerType?: CustomerType;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dob?: string;
  gender?: string;
  gstNumber?: string;
  creditLimit?: number;
  marketingOptIn?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  notes?: string;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  status?: CustomerStatus;
}

export interface FindCustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStatistics {
  totalPurchases: number;
  totalSpending: number;
  averageBasket: number;
  lastVisit: string | null;
  firstVisit: string | null;
  customerSince: string;
  mostPurchasedProduct: string | null;
  favoriteStore: string | null;
  averageVisitGapDays: string;
  purchaseFrequency: string;
  outstandingBalance: string | number;
  loyaltyPoints: {
    current: number;
    lifetime: number;
    tier: string;
  };
}
