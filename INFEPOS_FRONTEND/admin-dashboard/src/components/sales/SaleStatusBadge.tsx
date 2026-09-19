import React from 'react';
import type { SaleStatus } from '../../types/sales';

interface SaleStatusBadgeProps {
  status: SaleStatus;
}

const STATUS_STYLES: Record<SaleStatus, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  PARTIALLY_RETURNED: 'bg-yellow-100 text-yellow-800',
};

const SaleStatusBadge: React.FC<SaleStatusBadgeProps> = ({ status }) => {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default SaleStatusBadge;
