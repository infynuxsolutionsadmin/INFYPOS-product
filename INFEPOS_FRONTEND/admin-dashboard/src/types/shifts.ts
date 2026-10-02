export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  id: string;
  storeId: string;
  openedById: string;
  closedById: string | null;
  status: ShiftStatus;
  openedAt: string;
  closedAt: string | null;
  startingFloat: string | number;
  declaredCash: string | number | null;
  expectedCash: string | number | null;
  variance: string | number | null;
  createdAt: string;
  updatedAt: string;
  store: {
    id: string;
    name: string;
    code: string;
  };
  openedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  closedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface FindShiftsQuery {
  page?: number;
  limit?: number;
  storeId?: string;
  userId?: string;
  status?: ShiftStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShiftsResponse {
  items: Shift[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
