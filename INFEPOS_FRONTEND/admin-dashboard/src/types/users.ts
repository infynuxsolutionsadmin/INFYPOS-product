export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserRole {
  id: string;
  name: string;
  code: string;
}

export interface UserStore {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  status: UserStatus;
  roleId: string;
  storeId: string | null;
  role?: UserRole;
  store?: UserStore | null;
}

export interface CreateUserPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  roleId: string;
  storeId?: string;
  password: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  storeId?: string | null;
  status?: UserStatus;
}

export interface FindUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  storeId?: string;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Minimal role shape used for dropdowns (from GET /roles)
export interface RoleOption {
  id: string;
  name: string;
  code: string;
}
