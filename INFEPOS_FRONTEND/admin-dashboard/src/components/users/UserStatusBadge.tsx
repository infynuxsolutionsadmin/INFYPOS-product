import React from 'react';
import type { UserStatus } from '../../types/users';

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

const UserStatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);

export default UserStatusBadge;
