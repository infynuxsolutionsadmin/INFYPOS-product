import React from 'react';
import type { RoleStatus } from '../../types/roles';

const STATUS_STYLES: Record<RoleStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

const RoleStatusBadge: React.FC<{ status: RoleStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);

export default RoleStatusBadge;
