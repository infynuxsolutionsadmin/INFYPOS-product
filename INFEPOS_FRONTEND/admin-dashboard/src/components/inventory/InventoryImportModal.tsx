import React, { useState, useEffect } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, Store as StoreIcon, ArrowDownToLine, Info, PlusCircle, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { bulkImportInventory, getInventoryExportData, type BulkImportInventoryResult } from '../../api/inventory.api';
import { getStores } from '../../api/stores.api';
import type { Store } from '../../types/stores';

interface InventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStoreId?: string;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedStoreId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportInventoryResult | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [targetStoreId, setTargetStoreId] = useState<string>(selectedStoreId || '');

  useEffect(() => {
    if (isOpen) {
      getStores({ limit: 100 })
        .then((res) => {
          const list = res.items || [];
          setStores(list);
          if (!targetStoreId && selectedStoreId) {
            setTargetStoreId(selectedStoreId);
          } else if (!targetStoreId && list.length === 1) {
            setTargetStoreId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedStoreId]);

  if (!isOpen) return null;

  const handleExportCurrentInventory = async () => {
    try {
      setExportLoading(true);
      const items = await getInventoryExportData(targetStoreId || undefined);

      if (!items || items.length === 0) {
        setParseError('No inventory records found to export for the selected store.');
        return;
      }

      const headers = [
        'InventoryId',
        'StoreId',
        'StoreCode',
        'StoreName',
        'ProductId',
        'SKU',
        'Barcode',
        'ProductName',
        'Category',
        'CurrentStock',
        'QuantityToAdd',
        'EditExistingStock',
        'MinStock',
        'MaxStock',
        'ReorderLevel',
        'Unit',
      ];

      const rows = items.map((i) => [
        `"${i.inventoryId}"`,
        `"${i.storeId}"`,
        `"${i.storeCode}"`,
        `"${(i.storeName || '').replace(/"/g, '""')}"`,
        `"${i.productId}"`,
        `"${i.sku}"`,
        `"${i.barcode || ''}"`,
        `"${(i.productName || '').replace(/"/g, '""')}"`,
        `"${(i.category || 'General').replace(/"/g, '""')}"`,
        i.currentStock,
        0, // Quantity to add (default 0 for easy filling)
        '', // EditExistingStock left empty by default
        i.minimumStock,
        i.maximumStock,
        i.reorderLevel,
        `"${i.unit || 'pcs'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `infepos_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setParseError(err.message || 'Failed to export current inventory.');
    } finally {
      setExportLoading(false);
    }
  };

  const downloadBlankTemplate = () => {
    const sampleStoreCode = stores.length > 0 ? stores[0].code : 'MAIN';
    const sampleStoreName = stores.length > 0 ? stores[0].name : 'Main Store';
    const sampleStoreId = stores.length > 0 ? stores[0].id : '';

    const csvContent = `StoreCode,StoreName,StoreId,ProductId,SKU,Barcode,ProductName,QuantityToAdd,EditExistingStock,MinStock,MaxStock,ReorderLevel
${sampleStoreCode},${sampleStoreName},${sampleStoreId},,MILK-101,5012345678901,Organic Whole Milk 1L,50,,10,500,20
${sampleStoreCode},${sampleStoreName},${sampleStoreId},,BREAD-202,5012345678902,Wholewheat Bread 800g,25,,5,200,10
${sampleStoreCode},${sampleStoreName},${sampleStoreId},,WTR-303,5012345678903,Sparkling Water 500ml,100,,20,1000,50`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'infepos_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (fileToParse: File) => {
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          setParseError('The uploaded file is empty.');
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setParseError('No worksheet found in file.');
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (!rawGrid || rawGrid.length < 2) {
          setParseError('Spreadsheet must contain a header row and at least one data row.');
          return;
        }

        const headers = (rawGrid[0] || []).map((h) =>
          String(h || '')
            .trim()
            .replace(/^["']|["']$/g, '')
            .toLowerCase()
        );

        const findIndex = (keys: string[]) => headers.findIndex((h) => keys.includes(h));

        // Product identifiers
        const productIdIdx = findIndex(['productid', 'product_id', 'product_uuid', 'id']);
        const skuIdx = findIndex(['sku', 'code', 'product_code', 'productsku']);
        const barcodeIdx = findIndex(['barcode', 'ean', 'upc', 'gtin']);
        const nameIdx = findIndex(['productname', 'product_name', 'name', 'title']);

        // Store identifiers
        const storeIdIdx = findIndex(['storeid', 'store_id', 'store_uuid']);
        const storeCodeIdx = findIndex(['storecode', 'store_code', 'store', 'shop', 'branch']);
        const storeNameIdx = findIndex(['storename', 'store_name']);

        // Stock quantity fields
        const qtyToAddIdx = findIndex([
          'quantitytoadd',
          'quantity_to_add',
          'addquantity',
          'add_quantity',
          'addstock',
          'add_stock',
          'amounttoadd',
          'amount_to_add',
        ]);
        const editStockIdx = findIndex([
          'editexistingstock',
          'edit_existing_stock',
          'editstock',
          'edit_stock',
          'setstock',
          'set_stock',
          'newstock',
          'new_stock',
          'settotalstock',
        ]);

        const minStockIdx = findIndex(['minstock', 'min_stock', 'minimumstock', 'minimum_stock']);
        const maxStockIdx = findIndex(['maxstock', 'max_stock', 'maximumstock', 'maximum_stock']);
        const reorderIdx = findIndex(['reorderlevel', 'reorder_level', 'reorder']);

        if (productIdIdx === -1 && skuIdx === -1 && barcodeIdx === -1) {
          setParseError('Could not find a Product identifier (ProductId, SKU, or Barcode) in spreadsheet header.');
          return;
        }

        const rows: any[] = [];

        for (let i = 1; i < rawGrid.length; i++) {
          const values = rawGrid[i] || [];
          if (!values || values.length === 0) continue;

          const productId = productIdIdx !== -1 ? String(values[productIdIdx] || '').trim() : '';
          const sku = skuIdx !== -1 ? String(values[skuIdx] || '').trim() : '';
          const barcode = barcodeIdx !== -1 ? String(values[barcodeIdx] || '').trim() : '';
          const productName = nameIdx !== -1 ? String(values[nameIdx] || '').trim() : '';

          if (!productId && !sku && !barcode) continue;

          const storeId = storeIdIdx !== -1 ? String(values[storeIdIdx] || '').trim() : '';
          const storeCode = storeCodeIdx !== -1 ? String(values[storeCodeIdx] || '').trim() : '';
          const storeName = storeNameIdx !== -1 ? String(values[storeNameIdx] || '').trim() : '';

          const parseNum = (val: any) => {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              const n = parseFloat(String(val));
              if (!isNaN(n)) return n;
            }
            return undefined;
          };

          const rawQtyToAdd = qtyToAddIdx !== -1 ? parseNum(values[qtyToAddIdx]) : undefined;
          const rawEditStock = editStockIdx !== -1 ? parseNum(values[editStockIdx]) : undefined;
          const rawMin = minStockIdx !== -1 ? parseNum(values[minStockIdx]) : undefined;
          const rawMax = maxStockIdx !== -1 ? parseNum(values[maxStockIdx]) : undefined;
          const rawReorder = reorderIdx !== -1 ? parseNum(values[reorderIdx]) : undefined;

          rows.push({
            productId: productId || undefined,
            sku: sku || undefined,
            barcode: barcode || undefined,
            productName: productName || undefined,
            storeId: storeId || undefined,
            storeCode: storeCode || undefined,
            storeName: storeName || undefined,
            quantityToAdd: rawQtyToAdd,
            newStock: rawEditStock,
            minimumStock: rawMin,
            maximumStock: rawMax,
            reorderLevel: rawReorder,
          });
        }

        if (rows.length === 0) {
          setParseError('No valid inventory rows found in the file.');
          return;
        }

        setParsedData(rows);
      } catch (err: any) {
        setParseError('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(fileToParse);
  };

  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    setParseError(null);
    setProgressStatus('Starting inventory import...');

    let totalUpdated = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);

    try {
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const chunk = parsedData.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);
        const startNum = chunkIdx * CHUNK_SIZE + 1;
        const endNum = Math.min((chunkIdx + 1) * CHUNK_SIZE, parsedData.length);

        setProgressStatus(`Processing rows ${startNum} to ${endNum} of ${parsedData.length}...`);

        const result = await bulkImportInventory(chunk, 'ADD', targetStoreId || undefined);
        totalUpdated += result.updatedCount;
        totalCreated += result.createdCount;
        totalSkipped += result.skippedCount;
        if (result.errors && result.errors.length > 0) {
          allErrors.push(...result.errors);
        }
      }

      setImportResult({
        updatedCount: totalUpdated,
        createdCount: totalCreated,
        skippedCount: totalSkipped,
        totalProcessed: parsedData.length,
        errors: allErrors.slice(0, 50),
      });

      if (totalUpdated > 0 || totalCreated > 0) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Bulk inventory import failed.';
      setParseError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
      setProgressStatus('');
    }
  };

  const resetModal = () => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="inline-block bg-white rounded-3xl text-left overflow-hidden shadow-2xl border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-6 py-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Import Inventory & Stock Levels</h3>
                <p className="text-xs text-emerald-100 font-medium">
                  Export existing numbers, add new stock, or assign products to stores
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Step 1: Export Current Inventory or Download Template */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1.5">
                    Recommended Workflow
                  </span>
                  <p className="text-xs font-bold text-emerald-950">1. Export Existing Inventory</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Download current stock levels with Product IDs and Store IDs, edit numbers in Excel, and upload back.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCurrentInventory}
                  disabled={exportLoading}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {exportLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  )}
                  Export Current Stock (.CSV)
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full inline-block mb-1.5">
                    Clean Template
                  </span>
                  <p className="text-xs font-bold text-slate-800">2. Download Blank Template</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Sample spreadsheet with Store Code, Product ID, SKU, and Quantity fields.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadBlankTemplate}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample Template
                </button>
              </div>
            </div>

            {/* Error banner */}
            {parseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Import Result Summary */}
            {importResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Inventory Import Complete!</h4>
                    <p className="text-xs font-medium text-emerald-700">
                      Updated <strong className="font-extrabold">{importResult.updatedCount}</strong> existing product stocks,
                      and initialized <strong className="font-extrabold">{importResult.createdCount}</strong> new store combinations.
                      {importResult.skippedCount > 0 && ` (${importResult.skippedCount} skipped rows).`}
                    </p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3 bg-white/80 border border-amber-200 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-amber-800">Skipped Row Details ({importResult.errors.length}):</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="font-mono text-[0.7rem]">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!importResult && (
              <>
                {/* Intuitive Guide & Store Configuration */}
                <div className="space-y-4">
                  {/* Visual Column Explanation Card */}
                  <div className="bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/60 border border-emerald-100/90 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                          <Info className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                          Spreadsheet Column Guide
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                        Automatic Detection
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* QuantityToAdd Guide */}
                      <div className="p-3 bg-white border border-emerald-200/70 rounded-xl shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                          <PlusCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>QuantityToAdd Column</span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          <strong>Adds new stock</strong> from shipments or suppliers. It automatically adds to current shelf stock (e.g. Current: 100 + Add: 25 = <strong>125</strong>).
                        </p>
                      </div>

                      {/* EditExistingStock Guide */}
                      <div className="p-3 bg-white border border-blue-200/70 rounded-xl shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-800">
                          <Edit3 className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>EditExistingStock Column</span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          <strong>Directly sets/overrides stock</strong> for audits or shelf count corrections. It updates directly to your number (e.g. setting 75 changes stock to <strong>75</strong>).
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 italic">
                      💡 You can use both columns in the same file! Leave any column blank or 0 if you do not want to change it.
                    </p>
                  </div>

                  {/* Fallback Store Selector */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <StoreIcon className="h-4 w-4 text-emerald-600" />
                        Target / Fallback Store:
                      </label>
                      <span className="text-[11px] text-gray-400">Applies if row has no StoreCode / StoreName</span>
                    </div>
                    <select
                      value={targetStoreId}
                      onChange={(e) => setTargetStoreId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
                    >
                      <option value="">-- Auto-detect from file rows (StoreCode / StoreName) --</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Upload Drop Zone */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Select or Drag Excel (.xlsx) or CSV File
                  </label>
                  <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-6 text-center transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                      <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-700">
                        {file ? file.name : 'Click to select or drag Excel (.xlsx) or CSV file here'}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Supports Excel (.xlsx, .xls) and CSV files saved from Microsoft Excel, Sheets, or INFYPOS
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                {parsedData.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Parsed {parsedData.length} inventory rows ready to process
                      </p>
                      <button
                        type="button"
                        onClick={resetModal}
                        className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                      >
                        Clear File
                      </button>
                    </div>

                    <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 text-gray-500 font-bold sticky top-0 border-b border-gray-100">
                          <tr>
                            <th className="py-2 px-3">Product / SKU</th>
                            <th className="py-2 px-3">Store</th>
                            <th className="py-2 px-3">Stock Update</th>
                            <th className="py-2 px-3">Min / Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {parsedData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold">
                                {row.productName || row.sku || row.productId || 'Unknown'}
                                {row.sku && <span className="block text-[10px] text-gray-400 font-mono">{row.sku}</span>}
                              </td>
                              <td className="py-2 px-3">
                                {row.storeCode || row.storeName || row.storeId || (targetStoreId ? 'Default Store' : 'Auto')}
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-600">
                                {row.newStock !== undefined
                                  ? `Set to ${row.newStock}`
                                  : row.quantityToAdd !== undefined && row.quantityToAdd !== 0
                                  ? `+${row.quantityToAdd}`
                                  : '0 (No change)'}
                              </td>
                              <td className="py-2 px-3 text-gray-400">
                                {row.minimumStock ?? 5} / {row.maximumStock ?? 1000}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <p className="text-[11px] text-gray-400 text-center">
                        ...and {parsedData.length - 5} more items will be processed.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50/80 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-medium">{progressStatus}</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {!importResult && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={loading || parsedData.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import & Update Stock ({parsedData.length})
                    </>
                  )}
                </button>
              )}

              {importResult && (
                <button
                  type="button"
                  onClick={resetModal}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Import Another File
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
