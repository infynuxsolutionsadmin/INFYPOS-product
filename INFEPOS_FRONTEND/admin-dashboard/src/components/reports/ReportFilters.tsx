import React from 'react';

interface ReportFiltersProps {
  fromDate: string;
  toDate: string;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  storeId?: string;
  onStoreId?: (v: string) => void;
  stores?: { id: string; name: string }[];
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  extra?: React.ReactNode;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  fromDate, toDate, onFromDate, onToDate,
  storeId, onStoreId, stores,
  onApply, onReset, loading, extra,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3 items-end shadow-sm">
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
      <input
        type="date" value={fromDate}
        onChange={e => onFromDate(e.target.value)}
        className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
      <input
        type="date" value={toDate}
        onChange={e => onToDate(e.target.value)}
        className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    {stores && onStoreId && (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Store</label>
        <select
          value={storeId || ''}
          onChange={e => onStoreId(e.target.value)}
          className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    )}
    {extra}
    <div className="flex gap-2">
      <button
        onClick={onApply}
        disabled={loading}
        className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        Apply
      </button>
      <button
        onClick={onReset}
        disabled={loading}
        className="px-4 py-1.5 rounded-md border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  </div>
);

export default ReportFilters;
