import client from './client';
import type { User, CreateUserPayload, UpdateUserPayload, FindUsersQuery, RoleOption } from '../types/users';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getUsers = async (
  query?: FindUsersQuery
): Promise<PaginatedResponse<User>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<User>>>('/users', {
    params: query,
  });
  return response.data.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const response = await client.get<BackendResponse<User>>(`/users/${id}`);
  return response.data.data;
};

export const createUser = async (data: CreateUserPayload): Promise<User> => {
  const response = await client.post<BackendResponse<User>>('/users', data);
  return response.data.data;
};

export const updateUser = async (id: string, data: UpdateUserPayload): Promise<User> => {
  const response = await client.patch<BackendResponse<User>>(`/users/${id}`, data);
  return response.data.data;
};

// DELETE = soft deactivate (sets INACTIVE, revokes refresh tokens)
export const deactivateUser = async (id: string): Promise<User> => {
  const response = await client.delete<BackendResponse<User>>(`/users/${id}`);
  return response.data.data;
};

// Used to populate the role dropdown in UserFormModal
export const getRoles = async (): Promise<RoleOption[]> => {
  const response = await client.get<BackendResponse<PaginatedResponse<RoleOption>>>('/roles', {
    params: { limit: 100 },
  });
  return response.data.data.items;
};
