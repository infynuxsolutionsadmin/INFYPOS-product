import React from 'react';

interface Column {
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessor: string | ((row: any) => React.ReactNode);
  className?: string;
}

interface ReportTableProps {
  columns: Column[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  keyField: string;
  loading?: boolean;
  emptyMessage?: string;
}

function ReportTable({ columns, data, keyField, loading, emptyMessage = 'No data found.' }: ReportTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row) => (
            <tr key={String(row[keyField])} className="hover:bg-gray-50 transition-colors">
              {columns.map((col, i) => (
                <td key={i} className={`px-4 py-3 whitespace-nowrap text-gray-700 ${col.className ?? ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : String(row[col.accessor] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ReportTable;
