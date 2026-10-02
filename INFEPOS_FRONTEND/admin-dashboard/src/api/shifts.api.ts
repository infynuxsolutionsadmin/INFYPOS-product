import client from './client';
import type { FindShiftsQuery, ShiftsResponse } from '../types/shifts';

export const getShifts = async (params: FindShiftsQuery): Promise<ShiftsResponse> => {
  const { data } = await client.get('/shifts', { params });
  return data.data;
};

export const getShiftXReport = async (shiftId: string) => {
  const { data } = await client.get(`/shifts/${shiftId}/x-report`);
  return data.data;
};

export const getShiftZReport = async (shiftId: string) => {
  const { data } = await client.get(`/shifts/${shiftId}/z-report`);
  return data.data;
};
