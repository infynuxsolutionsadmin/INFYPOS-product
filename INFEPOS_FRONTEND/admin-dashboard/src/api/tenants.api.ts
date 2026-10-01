import client from './client';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface QueryTenantDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const getTenants = async (query?: QueryTenantDto) => {
  const response = await client.get<any>('/tenants', { params: query });
  return response.data.data; // response.data is the axios body, .data is the interceptor wrapper
};

export const createTenant = async (data: { name: string; code: string; email?: string; phone?: string; ownerEmail: string; ownerFirstName: string; ownerLastName: string }) => {
  const response = await client.post<any>('/tenants', data);
  return response.data.data;
};

export const updateTenant = async (id: string, data: Partial<Tenant>) => {
  const response = await client.patch<any>(`/tenants/${id}`, data);
  return response.data.data;
};
