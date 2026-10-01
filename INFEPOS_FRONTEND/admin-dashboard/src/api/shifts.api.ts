import client from './client';



export const getShiftXReport = async (shiftId: string) => {
  const { data } = await client.get(`/shifts/${shiftId}/x-report`);
  return data.data;
};

export const getShiftZReport = async (shiftId: string) => {
  const { data } = await client.get(`/shifts/${shiftId}/z-report`);
  return data.data;
};
