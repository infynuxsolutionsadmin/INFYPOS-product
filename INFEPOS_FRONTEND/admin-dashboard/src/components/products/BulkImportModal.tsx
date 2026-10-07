import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { bulkImportProducts, type BulkImportResult } from '../../api/products.api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent = `Name,SKU,Barcode,SellingPrice,CostPrice,VatRate,Category,Unit,Description
Organic Whole Milk 1L,MILK-101,5012345678901,1.50,0.90,0,Dairy,L,1 Liter Fresh Organic Milk
Wholewheat Bread 800g,BREAD-202,5012345678902,1.20,0.60,0,Bakery,Loaf,Fresh Baked Wheat Bread
Sparkling Water 500ml,WTR-303,5012345678903,0.85,0.30,20,Beverages,Bottles,Carbonated Mineral Water
Dark Chocolate Bar 100g,CHOC-404,5012345678904,2.50,1.20,20,Confectionery,Bar,70% Cocoa Artisan Chocolate
Extra Virgin Olive Oil 500ml,OIL-505,5012345678905,5.99,3.50,0,Pantry,Bottle,Cold-pressed Italian Olive Oil`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'infypos_products_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseCsv(selectedFile);
  };

  const parseCsv = (fileToParse: File) => {
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setParseError('The uploaded file is empty.');
          return;
        }

        const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');
        if (lines.length < 2) {
          setParseError('CSV must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

        // Map column aliases
        const findIndex = (keys: string[]) => headers.findIndex((h) => keys.includes(h));

        const nameIdx = findIndex(['name', 'product name', 'product_name', 'title']);
        const skuIdx = findIndex(['sku', 'code', 'product_code', 'productcode']);
        const barcodeIdx = findIndex(['barcode', 'ean', 'upc', 'gtin']);
        const sellingPriceIdx = findIndex(['sellingprice', 'selling_price', 'price', 'retail_price']);
        const costPriceIdx = findIndex(['costprice', 'cost_price', 'cost', 'buy_price']);
        const vatRateIdx = findIndex(['vatrate', 'vat_rate', 'vat', 'tax_rate']);
        const categoryIdx = findIndex(['category', 'category_name', 'department']);
        const unitIdx = findIndex(['unit', 'uom']);
        const descIdx = findIndex(['description', 'desc', 'notes']);

        if (nameIdx === -1) {
          setParseError('Could not find a "Name" column in CSV header. Required columns: Name, SellingPrice.');
          return;
        }

        const products: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          // Parse values respecting quotes
          const rawRow = lines[i];
          const values: string[] = [];
          let inQuotes = false;
          let currentValue = '';

          for (let charIdx = 0; charIdx < rawRow.length; charIdx++) {
            const char = rawRow[charIdx];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim().replace(/^["']|["']$/g, ''));

          const name = values[nameIdx] || '';
          if (!name) continue; // Skip empty name rows

          products.push({
            name,
            sku: skuIdx !== -1 ? values[skuIdx] || '' : '',
            barcode: barcodeIdx !== -1 ? values[barcodeIdx] || '' : '',
            sellingPrice: sellingPriceIdx !== -1 ? parseFloat(values[sellingPriceIdx]) || 0 : 0,
            costPrice: costPriceIdx !== -1 ? parseFloat(values[costPriceIdx]) || 0 : 0,
            vatRate: vatRateIdx !== -1 ? parseFloat(values[vatRateIdx]) || 20 : 20,
            category: categoryIdx !== -1 ? values[categoryIdx] || 'General' : 'General',
            unit: unitIdx !== -1 ? values[unitIdx] || 'pcs' : 'pcs',
            description: descIdx !== -1 ? values[descIdx] || '' : '',
          });
        }

        if (products.length === 0) {
          setParseError('No valid product rows found in the CSV file.');
          return;
        }

        setParsedData(products);
      } catch (err: any) {
        setParseError('Failed to parse CSV file: ' + err.message);
      }
    };

    reader.readAsText(fileToParse);
  };

  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    setParseError(null);
    setProgressStatus('Starting import...');

    let totalImported = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    const CHUNK_SIZE = 1000;
    const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);

    try {
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const chunk = parsedData.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);
        const startNum = chunkIdx * CHUNK_SIZE + 1;
        const endNum = Math.min((chunkIdx + 1) * CHUNK_SIZE, parsedData.length);

        setProgressStatus(`Importing items ${startNum} to ${endNum} of ${parsedData.length} (${Math.round((endNum / parsedData.length) * 100)}%)...`);

        const result = await bulkImportProducts(chunk);
        totalImported += result.importedCount;
        totalSkipped += result.skippedCount;
        if (result.errors && result.errors.length > 0) {
          allErrors.push(...result.errors);
        }
      }

      setImportResult({
        importedCount: totalImported,
        skippedCount: totalSkipped,
        totalProcessed: parsedData.length,
        errors: allErrors.slice(0, 50),
      });

      if (totalImported > 0) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Bulk import failed.';
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Bulk Product Import (CSV / Excel)</h3>
                <p className="text-xs text-indigo-100 font-medium">Onboard 1,000+ catalog items in seconds</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Step 1: Download Template */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-900">Need a CSV template?</p>
                <p className="text-xs text-indigo-600 font-medium">Download our pre-formatted spreadsheet template with sample product data.</p>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
              >
                <Download className="h-4 w-4" />
                Download CSV Template
              </button>
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
                    <h4 className="text-sm font-bold text-emerald-900">Import Complete!</h4>
                    <p className="text-xs font-medium text-emerald-700">
                      Successfully imported <strong className="font-extrabold">{importResult.importedCount}</strong> out of {importResult.totalProcessed} products.
                      {importResult.skippedCount > 0 && ` (${importResult.skippedCount} skipped due to duplicates or formatting).`}
                    </p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3 bg-white/80 border border-amber-200 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-amber-800">Skipped Item Details ({importResult.errors.length}):</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="font-mono text-[0.7rem]">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* File Upload Drop Zone */}
            {!importResult && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select or Drag CSV File</label>
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-2xl p-8 text-center transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-800">
                    {file ? file.name : 'Click to upload or drag and drop CSV file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports UTF-8 formatted CSV files (.csv)</p>
                </div>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedData.length > 0 && !importResult && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-700">
                    Parsed Catalog Preview ({parsedData.length} Items Found):
                  </p>
                  <button onClick={resetModal} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
                    <RefreshCw className="h-3 w-3" /> Re-upload file
                  </button>
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-gray-50/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100/80 text-gray-600 font-bold uppercase text-[0.65rem] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                        <th className="py-2.5 px-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {parsedData.slice(0, 15).map((item, i) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                          <td className="py-2 px-3 font-mono text-[0.7rem] text-gray-400">{i + 1}</td>
                          <td className="py-2 px-3 font-semibold text-gray-900">{item.name}</td>
                          <td className="py-2 px-3 font-mono text-gray-500">{item.sku || '(Auto-generated)'}</td>
                          <td className="py-2 px-3 font-mono text-gray-500">{item.barcode || '—'}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">£{item.sellingPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-gray-600">{item.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 15 && (
                  <p className="text-[0.7rem] text-gray-400 text-right">...and {parsedData.length - 15} more items</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {!importResult && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={loading || parsedData.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {progressStatus || `Importing ${parsedData.length} Products...`}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Confirm & Import {parsedData.length} Products
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
