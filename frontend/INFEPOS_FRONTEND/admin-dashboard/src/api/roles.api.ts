import client from './client';
import type { Role, CreateRolePayload, UpdateRolePayload, UpdateRolePermissionsPayload, FindRolesQuery } from '../types/roles';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getRoles = async (query?: FindRolesQuery): Promise<PaginatedResponse<Role>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Role>>>('/roles', { params: query });
  return response.data.data;
};

export const getRoleById = async (id: string): Promise<Role> => {
  const response = await client.get<BackendResponse<Role>>(`/roles/${id}`);
  return response.data.data;
};

export const createRole = async (data: CreateRolePayload): Promise<Role> => {
  const response = await client.post<BackendResponse<Role>>('/roles', data);
  return response.data.data;
};

export const updateRole = async (id: string, data: UpdateRolePayload): Promise<Role> => {
  const response = await client.patch<BackendResponse<Role>>(`/roles/${id}`, data);
  return response.data.data;
};

// DELETE = soft deactivate. Blocked for isSystem roles and roles with active users.
export const deleteRole = async (id: string): Promise<Role> => {
  const response = await client.delete<BackendResponse<Role>>(`/roles/${id}`);
  return response.data.data;
};

// GET /roles/:id/permissions — returns assigned permissions
export const getRolePermissions = async (id: string) => {
  const response = await client.get<BackendResponse<{ id: string; code: string; name: string; module: string }[]>>(`/roles/${id}/permissions`);
  return response.data.data;
};

// PUT /roles/:id/permissions — bulk replace all permissions
export const updateRolePermissions = async (id: string, data: UpdateRolePermissionsPayload) => {
  const response = await client.put<BackendResponse<{ id: string; code: string; name: string; module: string }[]>>(`/roles/${id}/permissions`, data);
  return response.data.data;
};
