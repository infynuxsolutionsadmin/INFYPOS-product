import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Search,
  Loader2,
  AlertCircle,
  RotateCw,
  ShoppingBag,
  ShoppingCart,
  Landmark,
  CheckCircle2,
  Clock,
  Undo2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
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
    ? sales.filter((s) => s.saleNumber.toLowerCase().includes(search.toLowerCase()))
    : sales;

  const displayedReturns = search
    ? returns.filter((r) => r.returnNumber.toLowerCase().includes(search.toLowerCase()))
    : returns;

  const getRowIconTheme = (method: string | undefined, index: number) => {
    if (method === 'BANK_TRANSFER') {
      return { bg: '#ede9fe', color: '#7c3aed', Icon: Landmark };
    }
    const themes = [
      { bg: '#f3e8ff', color: '#9333ea', Icon: ShoppingCart },
      { bg: '#e0f2fe', color: '#0284c7', Icon: ShoppingCart },
      { bg: '#ede9fe', color: '#7c3aed', Icon: Landmark },
      { bg: '#dcfce7', color: '#16a34a', Icon: ShoppingCart },
      { bg: '#ffe4e6', color: '#e11d48', Icon: ShoppingCart },
    ];
    return themes[index % themes.length];
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const dateFormatted = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()},`;
      const timeFormatted = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return { date: dateFormatted, time: timeFormatted };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#eafaf1',
            color: '#16a34a',
            border: '1px solid #d1fae5',
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <CheckCircle2 size={13} strokeWidth={2.5} />
          COMPLETED
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <Clock size={13} strokeWidth={2.5} />
          PENDING
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          border: '1px solid #fee2e2',
          padding: '5px 12px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        <AlertCircle size={13} strokeWidth={2.5} />
        {status}
      </span>
    );
  };

  const gridColumns =
    activeTab === 'SALES'
      ? '2.4fr 1.5fr 1.3fr 1.6fr 1.4fr 1.1fr'
      : '2.6fr 1.6fr 1.4fr 1.6fr 1.4fr';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          height: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          border: '1.5px solid #edf2f7',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(226, 232, 240, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 28px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          {/* Title + History Icon Bubble */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <History size={22} color="#7c3aed" strokeWidth={2.2} />
            </div>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Transaction History
            </h2>
          </div>

          {/* Segmented Pill Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '9999px',
              gap: '4px',
            }}
          >
            <button
              onClick={() => {
                setActiveTab('SALES');
                setPage(1);
                setSearch('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 20px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'SALES' ? '#6366f1' : 'transparent',
                color: activeTab === 'SALES' ? '#ffffff' : '#64748b',
                boxShadow:
                  activeTab === 'SALES'
                    ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                    : 'none',
              }}
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
              Sales
            </button>
            <button
              onClick={() => {
                setActiveTab('RETURNS');
                setPage(1);
                setSearch('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 20px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'RETURNS' ? '#6366f1' : 'transparent',
                color: activeTab === 'RETURNS' ? '#ffffff' : '#64748b',
                boxShadow:
                  activeTab === 'RETURNS'
                    ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                    : 'none',
              }}
            >
              <RotateCw size={16} strokeWidth={2.2} />
              Returns
            </button>
          </div>

          {/* Close Bubble Button */}
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
              e.currentTarget.style.color = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Search Bar & Refresh Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              color="#94a3b8"
              strokeWidth={2.2}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={`Search by ${activeTab === 'SALES' ? 'Sale' : 'Return'} Number...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 16px 0 46px',
                borderRadius: '16px',
                backgroundColor: '#fafbfc',
                border: '1.5px solid #edf2f7',
                color: '#1e293b',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.borderColor = '#c7d2fe';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = '#fafbfc';
                e.target.style.borderColor = '#edf2f7';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            onClick={() => fetchData(page)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: '#fafbfc',
              border: '1.5px solid #edf2f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fafbfc';
              e.currentTarget.style.borderColor = '#edf2f7';
            }}
          >
            <RotateCw size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Table Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Table Header Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumns,
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '12px 18px',
              marginBottom: '10px',
              minWidth: '780px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <span>{activeTab === 'SALES' ? 'Sale #' : 'Return #'}</span>
              <ChevronsUpDown size={13} color="#94a3b8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <span>Date</span>
              <ChevronsUpDown size={13} color="#94a3b8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <span>{activeTab === 'SALES' ? 'Total' : 'Refund'}</span>
              <ChevronsUpDown size={13} color="#94a3b8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <span>Method</span>
              <ChevronsUpDown size={13} color="#94a3b8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <span>Status</span>
              <ChevronsUpDown size={13} color="#94a3b8" />
            </div>
            {activeTab === 'SALES' && (
              <div style={{ textAlign: 'right', fontSize: '0.84rem', fontWeight: 700, color: '#334155', paddingRight: '6px' }}>
                Actions
              </div>
            )}
          </div>

          {/* Table Rows Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '2px',
              paddingBottom: '4px',
            }}
          >
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '220px',
                  gap: '0.75rem',
                  color: '#64748b',
                  fontSize: '0.92rem',
                }}
              >
                <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading transactions...</span>
              </div>
            ) : error ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '220px',
                  color: '#ef4444',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={32} />
                <p style={{ fontWeight: 600 }}>{error}</p>
              </div>
            ) : activeTab === 'SALES' && displayedSales.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: '0.92rem' }}>
                No sales found.
              </div>
            ) : activeTab === 'RETURNS' && displayedReturns.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: '0.92rem' }}>
                No returns found.
              </div>
            ) : activeTab === 'SALES' ? (
              displayedSales.map((sale, index) => {
                const theme = getRowIconTheme(sale.paymentMethod, index);
                const { date, time } = formatDateTime(sale.createdAt);
                const RowIcon = theme.Icon;

                return (
                  <div
                    key={sale.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridColumns,
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      border: '1.5px solid #edf2f7',
                      padding: '12px 18px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      minWidth: '780px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#edf2f7';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                    }}
                  >
                    {/* Sale # Column with Pastel Bubble Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: theme.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <RowIcon size={18} color={theme.color} strokeWidth={2.2} />
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          wordBreak: 'break-all',
                        }}
                      >
                        {sale.saleNumber}
                      </span>
                    </div>

                    {/* Date Column (Stacked Date & Time) */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.35,
                        fontWeight: 500,
                      }}
                    >
                      <span>{date}</span>
                      <span>{time}</span>
                    </div>

                    {/* Total Column (Vibrant Blue) */}
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: '#0284c7',
                      }}
                    >
                      {sale.grandTotal !== undefined && sale.grandTotal !== null
                        ? fmt(sale.grandTotal)
                        : '—'}
                    </div>

                    {/* Method Column */}
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      {sale.paymentMethod || '—'}
                    </div>

                    {/* Status Column */}
                    <div>{renderStatusBadge(sale.status)}</div>

                    {/* Actions Column (Bubble Return Button) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {sale.status === 'COMPLETED' ? (
                        <button
                          onClick={() => setSelectedSaleForReturn(sale)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '9999px',
                            padding: '6px 14px',
                            color: '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          <Undo2 size={13} strokeWidth={2.2} />
                          Return
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              displayedReturns.map((ret, index) => {
                const theme = getRowIconTheme(ret.refundMethod, index);
                const { date, time } = formatDateTime(ret.createdAt);
                const RowIcon = theme.Icon;

                return (
                  <div
                    key={ret.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridColumns,
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      border: '1.5px solid #edf2f7',
                      padding: '12px 18px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      minWidth: '780px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#edf2f7';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                    }}
                  >
                    {/* Return # Column */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: theme.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <RowIcon size={18} color={theme.color} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: '#0f172a',
                            wordBreak: 'break-all',
                          }}
                        >
                          {ret.returnNumber}
                        </div>
                        {ret.originalSale?.saleNumber && (
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {ret.originalSale.saleNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date Column */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.35,
                        fontWeight: 500,
                      }}
                    >
                      <span>{date}</span>
                      <span>{time}</span>
                    </div>

                    {/* Refund Column */}
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: '#ef4444',
                      }}
                    >
                      -{fmt(ret.refundTotal)}
                    </div>

                    {/* Method Column */}
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      {ret.refundMethod || '—'}
                    </div>

                    {/* Status Column */}
                    <div>{renderStatusBadge(ret.status)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '8px',
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => fetchData(page - 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '14px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #edf2f7',
              color: '#64748b',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (page > 1) {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (page > 1) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#edf2f7';
              }
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
            Previous
          </button>

          <span
            style={{
              fontSize: '0.88rem',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            Page {page} of {totalPages || 1}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => fetchData(page + 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 22px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
              boxShadow:
                page < totalPages
                  ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                  : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (page < totalPages) {
                e.currentTarget.style.backgroundColor = '#5558e6';
              }
            }}
            onMouseLeave={(e) => {
              if (page < totalPages) {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }
            }}
          >
            Next
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
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

