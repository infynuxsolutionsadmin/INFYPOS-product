import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, ScanBarcode, X, Monitor, Refrigerator, WashingMachine, Smartphone, Tv, Package, Upload, Download } from 'lucide-react';
import type { Product, FindProductsQuery, ProductStatus } from '../../types/products';
import { getProducts } from '../../api/products.api';
import { useAuthStore } from '../../stores/authStore';
import ProductFormModal from '../../components/products/ProductFormModal';
import DeleteConfirmModal from '../../components/products/DeleteConfirmModal';
import { BulkImportModal } from '../../components/products/BulkImportModal';
import { DeleteAllConfirmModal } from '../../components/products/DeleteAllConfirmModal';
import Barcode from 'react-barcode';

const ProductIcon = ({ category, name }: { category?: string | null; name: string }) => {
  const str = ((category || '') + ' ' + name).toLowerCase();
  if (str.includes('refrigerator') || str.includes('fridge')) return <Refrigerator className="h-6 w-6 text-blue-500" />;
  if (str.includes('washing machine') || str.includes('washer')) return <WashingMachine className="h-6 w-6 text-teal-500" />;
  if (str.includes('monitor') || str.includes('display')) return <Monitor className="h-6 w-6 text-indigo-500" />;
  if (str.includes('tv') || str.includes('television')) return <Tv className="h-6 w-6 text-purple-500" />;
  if (str.includes('phone') || str.includes('mobile')) return <Smartphone className="h-6 w-6 text-slate-500" />;
  return <Package className="h-6 w-6 text-gray-400" />;
};

const BarcodeModal = ({ isOpen, onClose, product }: { isOpen: boolean, onClose: () => void, product: Product | null }) => {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    const printArea = document.getElementById('barcode-print-area');
    if (!printArea) return;
    
    const printWindow = window.open('', '', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode - ${product.name}</title>
            <style>
              body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
              .product-name { font-size: 14px; margin-bottom: 10px; color: #555; }
            </style>
          </head>
          <body>
            ${printArea.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-[#1a1f36]">Product Barcode</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center justify-center">
          <div id="barcode-print-area" className="flex flex-col items-center">
            <p className="text-sm font-bold text-[#1a1f36] mb-4 product-name">{product.name}</p>
            {product.barcode ? (
               <Barcode value={product.barcode} width={2} height={100} displayValue={true} />
            ) : (
               <p className="text-red-500 font-medium">This product does not have a barcode assigned.</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end bg-slate-50/50">
           <button 
             onClick={handlePrint}
             disabled={!product.barcode}
             className="inline-flex items-center px-6 py-2.5 shadow-sm text-sm font-bold rounded-xl text-white bg-[#5B58F2] hover:bg-[#4a47d1] disabled:opacity-50 transition-colors"
           >
             Print Barcode
           </button>
        </div>
      </div>
    </div>
  );
};

const ProductsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('products.create');
  const canRead = hasPermission('products.read');
  const canUpdate = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindProductsQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
  });
  
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleExportCsv = () => {
    if (products.length === 0) return;
    
    const headers = ['Name', 'SKU', 'Barcode', 'SellingPrice', 'CostPrice', 'VatRate', 'Category', 'Unit', 'Status'];
    const rows = products.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      p.sellingPrice || 0,
      p.costPrice || 0,
      p.vatRate || 20,
      `"${(p.category || 'General').replace(/"/g, '""')}"`,
      `"${p.unit || 'pcs'}"`,
      p.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `infepos_products_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openBarcodeModal = (product: Product) => {
    setSelectedProduct(product);
    setIsBarcodeModalOpen(true);
  };

  const fetchProducts = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view products.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts(query);
      setProducts(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchProducts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as ProductStatus) : undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const openCreateModal = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage retail products, pricing, and bulk catalog onboarding.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canDelete && totalItems > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold rounded-full text-red-700 focus:outline-none transition-all shadow-sm"
              title="Delete all products from catalog"
            >
              <Trash2 className="mr-1.5 h-4 w-4 text-red-600" />
              Delete All ({totalItems})
            </button>
          )}

          <button
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold rounded-full text-gray-700 focus:outline-none transition-all shadow-sm disabled:opacity-50"
            title="Export current view to CSV file"
          >
            <Download className="mr-1.5 h-4 w-4 text-gray-500" />
            Export CSV
          </button>

          {canCreate && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-xs font-bold rounded-full text-indigo-700 focus:outline-none transition-all shadow-sm"
                title="Bulk import 1,000+ products via CSV"
              >
                <Upload className="mr-1.5 h-4 w-4 text-indigo-600" />
                Import CSV
              </button>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] text-xs font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all"
              >
                <Plus className="-ml-1 mr-1.5 h-4 w-4" aria-hidden="true" />
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 mb-6 flex flex-col sm:flex-row gap-4 transition-all">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query.search || ''}
            onChange={handleSearchChange}
            className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400"
            placeholder="Search by Name, SKU, Barcode..."
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={query.status || ''}
            onChange={handleStatusChange}
            className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-500 text-center font-medium">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B58F2]"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-gray-500 font-medium">
            <p>No products found.</p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Status</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="group hover:-translate-y-[1px] transition-transform duration-200">
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-l border-gray-100 first:rounded-l-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-indigo-50 rounded-[14px] flex items-center justify-center overflow-hidden flex-shrink-0 mr-4 border border-indigo-100/50">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="h-full w-full object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                if (e.target && (e.target as any).nextElementSibling) {
                                  ((e.target as any).nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className="h-full w-full flex items-center justify-center"
                            style={{ display: product.imageUrl ? 'none' : 'flex' }}
                          >
                            <ProductIcon category={product.category} name={product.name} />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#1a1f36]">{product.name}</div>
                          {product.brand && <div className="text-xs font-medium text-gray-400 mt-0.5">{product.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {product.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#1a1f36] bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      ${Number(product.sellingPrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                        product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        product.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="flex items-center justify-end space-x-2 pr-2">
                        {canRead && (
                          <button onClick={() => openBarcodeModal(product)} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" title="Show Barcode">
                            <ScanBarcode className="h-4 w-4" />
                          </button>
                        )}
                        {canUpdate && (
                          <button onClick={() => openEditModal(product)} className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => openDeleteModal(product)} className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full font-medium inline-block border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                      Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of <span className="font-bold text-[#1a1f36]">{totalItems}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                      disabled={(query.page || 1) <= 1}
                      className="px-4 py-2 rounded-full  bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Previous
                    </button>
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]">
                      {query.page || 1}
                    </div>
                    <button
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                      disabled={(query.page || 1) >= totalPages}
                      className="px-4 py-2 rounded-full  bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchProducts}
        product={selectedProduct}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={fetchProducts}
        product={selectedProduct}
      />

      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        product={selectedProduct}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchProducts}
      />

      <DeleteAllConfirmModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onSuccess={fetchProducts}
        totalProductsCount={totalItems}
      />
    </div>
  );
};

export default ProductsPage;
