export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  id: string;
  tenantId: string;
  storeId: string;
  openedById: string;
  status: ShiftStatus;
  startingFloat: number;
  openedAt: string;
  closedAt: string | null;
  closedById: string | null;
  declaredCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  zReportNumber: number | null;
  zReportData: Record<string, unknown> | null;
  managerOverrideId: string | null;
  openedBy?: {
    firstName: string;
    lastName: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OpenShiftRequest {
  /** Must be a number with max 2 decimal places and >= 0 */
  startingFloat: number;
}
