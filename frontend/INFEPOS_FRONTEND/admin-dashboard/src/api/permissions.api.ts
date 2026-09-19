import client from './client';
import type { Permission } from '../types/permissions';
import type { BackendResponse } from '../types/inventory';

// GET /permissions — returns all permissions with id, code, module
export const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await client.get<BackendResponse<Permission[]>>('/permissions');
  return response.data.data;
};
