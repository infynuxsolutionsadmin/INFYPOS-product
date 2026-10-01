import client from './client';
import type { Shift, OpenShiftRequest } from '../types/shift';
import type { BackendResponse } from '../types/product';

interface ShiftResponse extends BackendResponse<Shift> {}

/**
 * POST /shifts/open
 * Requires permission: shifts.open
 */
export const openShift = async (dto: OpenShiftRequest): Promise<Shift> => {
  const response = await client.post<ShiftResponse>('/shifts/open', dto);
  return response.data.data;
};

/**
 * GET /shifts/active
 * Gets the currently open shift for the user's store
 */
export const getActiveShift = async (): Promise<Shift | null> => {
  const response = await client.get<ShiftResponse>('/shifts/active');
  return response.data.data;
};

/**
 * GET /shifts/:id/x-report
 * Requires permission: shifts.xreport
 */
export const getXReport = async (shiftId: string): Promise<any> => {
  const response = await client.get<BackendResponse<any>>(`/shifts/${shiftId}/x-report`);
  return response.data.data;
};

/**
 * POST /shifts/:id/close
 * Requires permission: shifts.close
 */
export const closeShift = async (shiftId: string, dto: { declaredCash: number; managerOverrideId?: string }): Promise<Shift> => {
  const response = await client.post<ShiftResponse>(`/shifts/${shiftId}/close`, dto);
  return response.data.data;
};

/**
 * GET /shifts/:id/z-report
 * Requires permission: shifts.zreport
 */
export const getZReport = async (shiftId: string): Promise<any> => {
  const response = await client.get<BackendResponse<any>>(`/shifts/${shiftId}/z-report`);
  return response.data.data;
};
