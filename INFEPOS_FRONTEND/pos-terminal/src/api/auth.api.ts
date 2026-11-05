import client from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';

interface BackendLoginResponse {
  success: boolean;
  statusCode: number;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      tenantId: string;
      roleId: string;
      storeId: string | null;
      storeName?: string | null;
      email: string;
      firstName: string;
      lastName: string | null;
    };
  };
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await client.post<BackendLoginResponse>('/auth/login', data);
  const { accessToken, refreshToken, user } = response.data.data;

  // Persist tokens immediately so the permissions request can use them
  localStorage.setItem('pos_access_token', accessToken);
  localStorage.setItem('pos_refresh_token', refreshToken);

  // Optionally fetch permissions for the role
  let permissions: string[] = [];
  try {
    const permResponse = await client.get<any>(`/roles/${user.roleId}/permissions`);
    if (permResponse.data?.data) {
      permissions = permResponse.data.data.map((p: any) => p.code as string);
    }
  } catch {
    // Permissions are best-effort — continue without them
    console.warn('[POS] Could not fetch role permissions');
  }

  return {
    user,
    tokens: { accessToken, refreshToken },
    permissions,
  };
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const response = await client.post<{ data: { accessToken: string; refreshToken?: string } }>('/auth/refresh', {
    refreshToken,
  });
  const { accessToken: newToken, refreshToken: newRefreshToken } = response.data.data;
  localStorage.setItem('pos_access_token', newToken);
  // Backend rotates the refresh token on every use — persist the new one
  if (newRefreshToken) {
    localStorage.setItem('pos_refresh_token', newRefreshToken);
  }
  return newToken;
};

export interface VerifyPinResponse {
  accessToken: string;
  refreshToken: string;
  permissions: string[];
  user: {
    id: string;
    tenantId: string;
    tenantCode?: string;
    roleId: string;
    roleCode: string;
    storeId: string;
    storeName?: string;
    email: string;
    firstName: string;
    lastName: string | null;
  };
}

export type CashierLoginResponse = VerifyPinResponse;

export const cashierLogin = async (data: {
  storeId?: string;
  cashierId?: string;
  userId?: string;
  pin: string;
}): Promise<CashierLoginResponse> => {
  const response = await client.post<{ success: boolean; data: CashierLoginResponse }>(
    '/auth/cashier-login',
    data,
  );
  return response.data.data;
};

export const verifyPin = async (userId: string, pin: string): Promise<VerifyPinResponse> => {
  const response = await client.post<{ success: boolean; data: VerifyPinResponse }>('/auth/verify-pin', {
    userId,
    pin,
  });
  return response.data.data;
};

