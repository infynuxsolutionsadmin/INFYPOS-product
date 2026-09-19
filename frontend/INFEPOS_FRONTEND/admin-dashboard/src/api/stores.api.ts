import client from './client';
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  FindStoresQuery,
  PaginatedResponse,
  BackendResponse,
} from '../types/stores';

export const getStores = async (
  query?: FindStoresQuery
): Promise<PaginatedResponse<Store>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Store>>>('/stores', {
    params: query,
  });
  return response.data.data;
};

export const getStore = async (id: string): Promise<Store> => {
  const response = await client.get<BackendResponse<Store>>(`/stores/${id}`);
  return response.data.data;
};

export const createStore = async (data: CreateStoreRequest): Promise<Store> => {
  const response = await client.post<BackendResponse<Store>>('/stores', data);
  return response.data.data;
};

export const updateStore = async (id: string, data: UpdateStoreRequest): Promise<Store> => {
  const response = await client.patch<BackendResponse<Store>>(`/stores/${id}`, data);
  return response.data.data;
};

export const deleteStore = async (id: string): Promise<Store> => {
  const response = await client.delete<BackendResponse<Store>>(`/stores/${id}`);
  return response.data.data;
};
