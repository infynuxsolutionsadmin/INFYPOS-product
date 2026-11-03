import client from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';

interface BackendLoginResponse {
  success: boolean;
  statusCode: number;
  data: {
    accessToken: string;
    refreshToken: string;
    user: any;
  };
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await client.post<BackendLoginResponse>('/auth/login', data);
  const responseData = response.data.data;

  // Set the token temporarily so the permissions request uses the new token
  localStorage.setItem('access_token', responseData.accessToken);
  localStorage.setItem('refresh_token', responseData.refreshToken);

  let permissions: string[] = [];
  try {
    const permResponse = await client.get<any>(`/roles/${responseData.user.roleId}/permissions`);
    if (permResponse.data?.data) {
      permissions = permResponse.data.data.map((p: any) => p.code);
    }
  } catch (error) {
    console.error('Failed to fetch role permissions during login:', error);
  }

  return {
    user: responseData.user,
    tokens: {
      accessToken: responseData.accessToken,
      refreshToken: responseData.refreshToken,
    },
    permissions,
  };
};

export interface RegisterTenantRequest {
  storeName: string;
  tenantCode: string;
  ownerFirstName: string;
  ownerLastName: string;
  email: string;
  password: string;
  plan: string;
  billingCycle: string;
  paymentReference?: string;
}

export interface RegisterTenantResponse {
  tenant: {
    id: string;
    name: string;
    code: string;
    plan: string;
    billingCycle: string;
    status: string;
  };
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  permissions?: string[];
}

export const registerTenant = async (data: RegisterTenantRequest): Promise<RegisterTenantResponse> => {
  const response = await client.post<any>('/auth/register', data);
  const responseData = response.data.data;

  localStorage.setItem('access_token', responseData.tokens.accessToken);
  localStorage.setItem('refresh_token', responseData.tokens.refreshToken);

  let permissions: string[] = [];
  try {
    if (responseData.user?.roleId) {
      const permResponse = await client.get<any>(`/roles/${responseData.user.roleId}/permissions`);
      if (permResponse.data?.data) {
        permissions = permResponse.data.data.map((p: any) => p.code);
      }
    }
  } catch (error) {
    console.error('Failed to fetch role permissions during registration:', error);
  }

  return {
    ...responseData,
    permissions,
  };
};

export const logout = async (): Promise<void> => {
  // Assuming a logout endpoint exists or just clearing local state
  // await client.post('/auth/logout');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
