import React, { useState, useEffect } from 'react';
import { X, History, Search, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { getSalesHistory, getSalesReturnsHistory } from '../../api/sales.api';
import type { Sale } from '../../types/sale';
import ReturnModal from './ReturnModal';

interface SalesHistoryModalProps {
  onClose: () => void;
}

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'SALES' | 'RETURNS'>('SALES');
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);

  const fetchData = async (pg: number, tab = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'SALES') {
        const res = await getSalesHistory({ page: pg, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
        setSales(res.items);
        setTotalPages(res.pagination.pages);
        setPage(res.pagination.page);
      } else {
        const res = await getSalesReturnsHistory({ page: pg, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
        setReturns(res.items);
        setTotalPages(res.pagination.pages);
        setPage(res.pagination.page);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, activeTab);
  }, [activeTab]);

  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  const displayedSales = search 
    ? sales.filter(s => s.saleNumber.toLowerCase().includes(search.toLowerCase()))
    : sales;
    
  const displayedReturns = search 
    ? returns.filter(r => r.returnNumber.toLowerCase().includes(search.toLowerCase()))
    : returns;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="pos-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--pos-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--pos-accent)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transaction History</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--pos-bg-dark)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button 
              style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: activeTab === 'SALES' ? 'var(--pos-accent)' : 'transparent', color: activeTab === 'SALES' ? 'white' : 'var(--pos-text-muted)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setActiveTab('SALES'); setPage(1); setSearch(''); }}
            >
              Sales
            </button>
            <button 
              style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: activeTab === 'RETURNS' ? 'var(--pos-accent)' : 'transparent', color: activeTab === 'RETURNS' ? 'white' : 'var(--pos-text-muted)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setActiveTab('RETURNS'); setPage(1); setSearch(''); }}
            >
              Returns
            </button>
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
              placeholder={`Search by ${activeTab === 'SALES' ? 'Sale' : 'Return'} Number...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button className="btn-pos btn-ghost" onClick={() => fetchData(page)}>
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
          ) : activeTab === 'SALES' && displayedSales.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--pos-text-muted)', marginTop: '2rem' }}>No sales found.</div>
          ) : activeTab === 'RETURNS' && displayedReturns.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--pos-text-muted)', marginTop: '2rem' }}>No returns found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--pos-border)', color: 'var(--pos-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>{activeTab === 'SALES' ? 'Sale #' : 'Return #'}</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>{activeTab === 'SALES' ? 'Total' : 'Refund'}</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Method</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  {activeTab === 'SALES' && <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'SALES' ? (
                  displayedSales.map(sale => (
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
                  ))
                ) : (
                  displayedReturns.map(ret => (
                    <tr key={ret.id} style={{ borderBottom: '1px solid var(--pos-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                        {ret.returnNumber}
                        <div style={{ fontSize: '0.75rem', color: 'var(--pos-text-muted)' }}>{ret.originalSale?.saleNumber}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{new Date(ret.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#f87171' }}>-{fmt(ret.refundTotal)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{ret.refundMethod}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge ${ret.status === 'COMPLETED' ? 'badge-blue' : 'badge-red'}`}>{ret.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--pos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn-pos btn-ghost"
              disabled={page === 1}
              onClick={() => fetchData(page - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--pos-text-muted)' }}>Page {page} of {totalPages}</span>
            <button
              className="btn-pos btn-ghost"
              disabled={page === totalPages}
              onClick={() => fetchData(page + 1)}
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
            fetchData(page);
          }}
        />
      )}
    </div>
  );
};

export default SalesHistoryModal;
