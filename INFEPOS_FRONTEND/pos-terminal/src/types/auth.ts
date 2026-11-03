export interface LoginRequest {
  tenantCode?: string;
  storeCode?: string;
  email: string;
  password?: string;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  tenantCode?: string;
  storeCode?: string | null;
  storeId: string | null;
  storeName?: string | null;
  roleId: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
  permissions: string[];
}
