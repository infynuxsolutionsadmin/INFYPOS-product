import client from './client';
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  FindCustomersQuery,
  CustomerStatistics,
} from '../types/customers';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getCustomers = async (
  query?: FindCustomersQuery
): Promise<PaginatedResponse<Customer>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Customer>>>('/customers', {
    params: query,
  });
  return response.data.data;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
  const response = await client.get<BackendResponse<Customer>>(`/customers/${id}`);
  return response.data.data;
};

export const createCustomer = async (data: CreateCustomerPayload): Promise<Customer> => {
  const response = await client.post<BackendResponse<Customer>>('/customers', data);
  return response.data.data;
};

export const updateCustomer = async (id: string, data: UpdateCustomerPayload): Promise<Customer> => {
  const response = await client.patch<BackendResponse<Customer>>(`/customers/${id}`, data);
  return response.data.data;
};

export const deleteCustomer = async (id: string): Promise<Customer> => {
  const response = await client.delete<BackendResponse<Customer>>(`/customers/${id}`);
  return response.data.data;
};

export const getCustomerStatistics = async (id: string): Promise<CustomerStatistics> => {
  const response = await client.get<BackendResponse<CustomerStatistics>>(`/customers/${id}/statistics`);
  return response.data.data;
};
