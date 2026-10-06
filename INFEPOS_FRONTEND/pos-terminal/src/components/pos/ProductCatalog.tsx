import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ScanBarcode, X, Loader2, Package, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts } from '../../api/products.api';
import { useCartStore } from '../../stores/cartStore';
import type { Product } from '../../types/product';
import { useBarcodeScanner } from './useBarcodeScanner';

const ProductCatalog: React.FC = () => {
  const addItem = useCartStore((s) => s.addItem);

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (searchTerm: string, pg: number, category: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProducts({
        search: searchTerm || undefined,
        page: pg,
        limit: 24,
        category: category || undefined,
        status: 'ACTIVE',
      });
      setProducts(result.items);
      setTotalPages(result.pagination.pages);
      setTotalCount(result.pagination.total);

      // Build unique categories from first page results if no filter
      if (pg === 1 && !category && !searchTerm) {
        const cats = Array.from(new Set(result.items.map((p) => p.category).filter(Boolean))) as string[];
        setCategories(cats);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load products.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceSyncCatalog = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // Force fetch latest from cloud and save to local
      const { syncProductsToLocalDb } = await import('../../services/localDb');
      const client = (await import('../../api/client')).default;
      const res = await client.get('/products', { params: { status: 'ACTIVE', limit: 10000 } });
      const cloudItems = res.data.data.items || [];
      await syncProductsToLocalDb(cloudItems);
      // Re-fetch local to show updated catalog
      fetchProducts(search, 1, selectedCategory);
    } catch (err: any) {
      console.error('Manual catalog sync failed:', err);
      setError('Failed to sync catalog with cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchProducts(search, 1, selectedCategory);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, selectedCategory, fetchProducts]);

  useEffect(() => {
    fetchProducts(search, page, selectedCategory);
  }, [page]);

  const handleAdd = useCallback((product: Product) => {
    addItem(product);
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 600);
  }, [addItem]);

  // Handle barcode scanner input
  useBarcodeScanner(async (barcode) => {
    try {
      // Temporarily show loading state
      setLoading(true);
      // Fetch specifically for this barcode
      const result = await getProducts({
        search: barcode,
        page: 1,
        limit: 1,
        status: 'ACTIVE',
      });
      
      if (result.items.length > 0) {
        // If we found a product matching this barcode/sku, add it to cart instantly!
        handleAdd(result.items[0]);
      } else {
        // Not found via barcode
        setError(`Barcode not found: ${barcode}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Barcode scan error:', err);
    } finally {
      setLoading(false);
    }
  });

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    searchRef.current?.focus();
  };

  const fmt = (n: number | string) => `£${Number(n).toFixed(2)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Search bar */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--pos-border)',
          background: 'var(--pos-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
            <Search
            size={18}
            color="var(--pos-text-muted)"
            style={{ position: 'absolute', left: '0.875rem', pointerEvents: 'none' }}
          />
          <input
            id="product-search"
            ref={searchRef}
            type="text"
            className="pos-input"
            placeholder="Search by name, SKU, barcode or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.75rem', paddingRight: search ? '2.75rem' : '1rem' }}
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pos-text-dim)',
                display: 'flex',
              }}
            >
              <X size={16} />
              </button>
            )}
          </div>
          
          <button
            onClick={forceSyncCatalog}
            disabled={isSyncing}
            style={{
              marginLeft: '0.75rem',
              padding: '0 1rem',
              height: '42px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--pos-text)',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              flexShrink: 0
            }}
            title="Force refresh catalog from cloud"
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <ScanBarcode size={16} />}
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>
        </div>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            <button
              type="button"
              className={`btn-pos ${!selectedCategory ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              onClick={() => { setSelectedCategory(''); setPage(1); }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn-pos ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                onClick={() => { setSelectedCategory(cat); setPage(1); }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results info */}
      {!loading && !error && (
        <div
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.75rem',
            color: 'var(--pos-text-dim)',
            borderBottom: '1px solid var(--pos-border)',
            background: 'var(--pos-bg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ScanBarcode size={14} />
          {totalCount} product{totalCount !== 1 ? 's' : ''} found
          {search && <span>· matching "<strong style={{ color: 'var(--pos-text-muted)' }}>{search}</strong>"</span>}
        </div>
      )}

      {/* Product grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.75rem', color: 'var(--pos-text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite' }} />
            <span>Loading products…</span>
          </div>
        ) : error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '0.75rem',
              color: '#fca5a5',
            }}
          >
            <AlertCircle size={36} />
            <p style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: 300 }}>{error}</p>
            <button
              type="button"
              className="btn-pos btn-ghost"
              onClick={() => fetchProducts(search, page, selectedCategory)}
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '0.75rem',
              color: 'var(--pos-text-dim)',
            }}
          >
            <Package size={40} strokeWidth={1.5} />
            <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>
              {search ? `No products found for "${search}"` : 'No active products found'}
            </p>
            {search && (
              <button type="button" className="btn-pos btn-ghost" onClick={handleClearSearch}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.65rem',
            }}
          >
            {products.map((product) => {
              const isAdded = addedIds.has(product.id);
              return (
                <button
                  key={product.id}
                  id={`product-card-${product.id}`}
                  type="button"
                  onClick={() => handleAdd(product)}
                  style={{
                    background: isAdded ? 'var(--pos-success-light)' : 'var(--pos-surface)',
                    border: `1px solid ${isAdded ? 'rgba(34,197,94,0.4)' : 'var(--pos-border)'}`,
                    borderRadius: 12,
                    padding: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    transform: isAdded ? 'scale(0.97)' : 'scale(1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAdded) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pos-accent)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--pos-surface-2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAdded) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pos-border)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--pos-surface)';
                    }
                  }}
                >
                  {/* Category badge */}
                  {product.category && (
                    <span className="badge badge-blue" style={{ alignSelf: 'flex-start', fontSize: '0.65rem' }}>
                      {product.category}
                    </span>
                  )}

                  {/* Product name */}
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: 'var(--pos-text)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4,
                    }}
                  >
                    {product.name}
                  </p>

                  {/* SKU / barcode */}
                  <p style={{ fontSize: '0.68rem', color: 'var(--pos-text-dim)', fontFamily: 'monospace' }}>
                    {product.sku}
                    {product.barcode && ` · ${product.barcode}`}
                  </p>

                  {/* Price + VAT indicator */}
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: isAdded ? 'var(--pos-success)' : 'var(--pos-accent)' }}>
                        {isAdded ? '✓ Added' : fmt(product.sellingPrice)}
                      </p>
                      {!isAdded && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)' }}>
                          VAT {product.vatRate}%
                        </p>
                      )}
                    </div>
                    {product.unit && (
                      <span
                        className="badge"
                        style={{ background: 'var(--pos-surface-2)', color: 'var(--pos-text-muted)', fontSize: '0.62rem' }}
                      >
                        {product.unit}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            padding: '0.6rem 1rem',
            borderTop: '1px solid var(--pos-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--pos-surface)',
            fontSize: '0.8rem',
            color: 'var(--pos-text-muted)',
          }}
        >
          <button
            type="button"
            className="btn-pos btn-ghost"
            style={{ padding: '0.35rem 0.75rem', gap: '0.3rem', fontSize: '0.8rem' }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-pos btn-ghost"
            style={{ padding: '0.35rem 0.75rem', gap: '0.3rem', fontSize: '0.8rem' }}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
