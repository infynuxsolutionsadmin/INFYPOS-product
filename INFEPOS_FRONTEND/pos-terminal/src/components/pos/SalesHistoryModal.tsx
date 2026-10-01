import React, { useState, useEffect } from 'react';
import { X, History, Search, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { getSalesHistory } from '../../api/sales.api';
import type { Sale } from '../../types/sale';
import ReturnModal from './ReturnModal';

interface SalesHistoryModalProps {
  onClose: () => void;
}

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ onClose }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);

  const fetchSales = async (pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSalesHistory({ page: pg, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
      setSales(res.items);
      setTotalPages(res.pagination.pages);
      setPage(res.pagination.page);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, []);

  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  // Filter local sales by search (naive search on saleNumber)
  const displayedSales = search 
    ? sales.filter(s => s.saleNumber.toLowerCase().includes(search.toLowerCase()))
    : sales;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="pos-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--pos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--pos-accent)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Sales History</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--pos-text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1rem', borderBottom: '1px solid var(--pos-border)', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pos-text-muted)' }} />
            <input
              type="text"
              className="pos-input"
              placeholder="Search by Sale Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button className="btn-pos btn-ghost" onClick={() => fetchSales(page)}>
            <RefreshCcw size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.5rem', color: 'var(--pos-text-muted)' }}>
              <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fca5a5', gap: '0.5rem' }}>
              <AlertCircle size={32} />
              <p>{error}</p>
            </div>
          ) : displayedSales.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--pos-text-muted)', marginTop: '2rem' }}>No sales found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--pos-border)', color: 'var(--pos-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Sale #</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Method</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedSales.map(sale => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid var(--pos-border)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sale.saleNumber}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{new Date(sale.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--pos-accent)' }}>{fmt(sale.grandTotal)}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{sale.paymentMethod}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className={`badge ${sale.status === 'COMPLETED' ? 'badge-blue' : 'badge-red'}`}>{sale.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {sale.status === 'COMPLETED' && (
                        <button
                          className="btn-pos btn-ghost"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedSaleForReturn(sale)}
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--pos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn-pos btn-ghost"
              disabled={page === 1}
              onClick={() => fetchSales(page - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--pos-text-muted)' }}>Page {page} of {totalPages}</span>
            <button
              className="btn-pos btn-ghost"
              disabled={page === totalPages}
              onClick={() => fetchSales(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedSaleForReturn && (
        <ReturnModal
          sale={selectedSaleForReturn}
          onClose={() => setSelectedSaleForReturn(null)}
          onSuccess={() => {
            setSelectedSaleForReturn(null);
            fetchSales(page);
          }}
        />
      )}
    </div>
  );
};

export default SalesHistoryModal;
