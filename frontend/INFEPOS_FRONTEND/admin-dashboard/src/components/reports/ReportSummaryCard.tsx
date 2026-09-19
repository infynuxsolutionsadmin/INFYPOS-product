import React from 'react';

interface ReportSummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}

const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({ label, value, sub, icon, color = 'text-blue-600' }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
    {icon && (
      <div className={`text-3xl ${color}`}>{icon}</div>
    )}
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default ReportSummaryCard;
