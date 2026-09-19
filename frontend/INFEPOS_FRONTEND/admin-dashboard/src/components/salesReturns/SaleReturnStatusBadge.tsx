import React from 'react';
import type { ReturnStatus } from '../../types/salesReturns';

interface SaleReturnStatusBadgeProps {
  status: ReturnStatus;
}

const STATUS_STYLES: Record<ReturnStatus, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const SaleReturnStatusBadge: React.FC<SaleReturnStatusBadgeProps> = ({ status }) => {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
      {status}
    </span>
  );
};

export default SaleReturnStatusBadge;
