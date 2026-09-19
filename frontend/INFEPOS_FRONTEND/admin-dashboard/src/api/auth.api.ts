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

export const logout = async (): Promise<void> => {
  // Assuming a logout endpoint exists or just clearing local state
  // await client.post('/auth/logout');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
