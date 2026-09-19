// Permission model fields returned by GET /permissions
export interface Permission {
  id: string;
  code: string;
  module: string;
}

// Returned by GET /permissions/modules (no IDs, grouped by module)
export interface PermissionModule {
  module: string;
  permissions: string[]; // codes only
}
