export type RoleStatus = 'ACTIVE' | 'INACTIVE';

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
  permissions?: RolePermission[];
}

export interface RolePermission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface CreateRolePayload {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  status?: RoleStatus;
}

export interface UpdateRolePermissionsPayload {
  permissionIds: string[];
}

export interface FindRolesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: RoleStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
