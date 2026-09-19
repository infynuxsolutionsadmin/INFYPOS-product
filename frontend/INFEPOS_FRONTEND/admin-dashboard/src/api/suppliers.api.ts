import client from './client';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  FindSuppliersQuery,
} from '../types/suppliers';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getSuppliers = async (
  query?: FindSuppliersQuery
): Promise<PaginatedResponse<Supplier>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Supplier>>>('/suppliers', {
    params: query,
  });
  return response.data.data;
};

export const getSupplierById = async (id: string): Promise<Supplier> => {
  const response = await client.get<BackendResponse<Supplier>>(`/suppliers/${id}`);
  return response.data.data;
};

export const createSupplier = async (data: CreateSupplierRequest): Promise<Supplier> => {
  const response = await client.post<BackendResponse<Supplier>>('/suppliers', data);
  return response.data.data;
};

export const updateSupplier = async (id: string, data: UpdateSupplierRequest): Promise<Supplier> => {
  const response = await client.patch<BackendResponse<Supplier>>(`/suppliers/${id}`, data);
  return response.data.data;
};

export const deleteSupplier = async (id: string): Promise<Supplier> => {
  const response = await client.delete<BackendResponse<Supplier>>(`/suppliers/${id}`);
  return response.data.data;
};
