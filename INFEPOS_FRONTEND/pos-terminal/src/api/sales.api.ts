import client from './client';
import type { CreateSaleRequest, Sale } from '../types/sale';
import type { BackendResponse } from '../types/product';

import { queueSyncEvent, isDesktopApp, decrementLocalProductStock } from '../services/localDb';

export const createSale = async (data: CreateSaleRequest): Promise<Sale> => {
  const headers = data.idempotencyKey ? { 'Idempotency-Key': data.idempotencyKey } : undefined;

  // 1. If online, attempt direct cloud checkout first
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const response = await client.post<BackendResponse<Sale>>('/sales', data, { headers });
      const onlineSale = response.data.data;

      // Decrement local stock immediately so POS UI reflects real-time remaining stock
      if (isDesktopApp()) {
        await decrementLocalProductStock(data.items);
      }

      return {
        ...onlineSale,
        isOffline: false,
      };
    } catch (err: any) {
      // If server returned a business validation error (4xx like inactive item, closed shift, etc),
      // DO NOT mask it as an offline sale — rethrow so cashier sees the exact validation error!
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        throw err;
      }
      // If network error / timeout, fall through to offline buffer
      console.warn('Direct sale submission failed due to network error, falling back to offline buffer:', err);
    }
  }

  // 2. Offline Fallback for Desktop App
  if (isDesktopApp()) {
    // Queue it locally for background sync
    const eventId = await queueSyncEvent('SALE', data);
    
    // Decrement local stock immediately so POS UI reflects real-time remaining stock
    await decrementLocalProductStock(data.items);
    
    // Calculate totals loosely for mock
    let grandTotal = data.payments.reduce((acc, p) => acc + p.amount, 0);

    // Mock a successful sale response so the UI clears the basket immediately
    const mockSale: Sale = {
      id: typeof eventId === 'string' ? eventId : crypto.randomUUID(),
      saleNumber: 'OFFLINE-' + Math.floor(Math.random() * 10000),
      tenantId: '',
      storeId: data.storeId,
      userId: '',
      customerId: data.customerId || null,
      customerName: null,
      customerCode: null,
      subtotal: grandTotal,
      taxAmount: 0,
      discountAmount: data.discountAmount || 0,
      grandTotal: grandTotal,
      paymentMethod: data.payments[0]?.paymentMethod || 'CASH',
      status: 'COMPLETED',
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shiftId: data.shiftId || null,
      items: data.items.map(i => ({
        id: crypto.randomUUID(),
        saleId: typeof eventId === 'string' ? eventId : 'mock',
        productId: i.productId,
        productName: 'Offline Item',
        sku: '',
        barcode: null,
        quantity: i.quantity,
        returnedQuantity: 0,
        unitPrice: 0,
        vatRate: 0,
        lineTotal: 0,
        createdAt: new Date().toISOString(),
      })),
      isOffline: true,
    };
    
    // Notify background sync manager to sync the queued item idempotently
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sync-queue-updated'));
    }
      
    return mockSale;
  }

  // 3. Fallback for Web/Browser testing (non-Electron)
  const response = await client.post<BackendResponse<Sale>>('/sales', data, { headers });
  return {
    ...response.data.data,
    isOffline: false,
  };
};

export const getSalesHistory = async (params?: any): Promise<{ items: Sale[]; pagination: any }> => {
  const response = await client.get<BackendResponse<{ items: Sale[]; pagination: any }>>('/sales', { params });
  return response.data.data;
};

export const getSalesReturnsHistory = async (params?: any): Promise<{ items: any[]; pagination: any }> => {
  const response = await client.get<BackendResponse<{ items: any[]; pagination: any }>>('/sales-returns', { params });
  return response.data.data;
};

export const getReturnableSale = async (saleId: string): Promise<any> => {
  const response = await client.get<BackendResponse<any>>(`/sales/${saleId}/returnable`);
  return response.data.data;
};

export const createSaleReturn = async (data: any): Promise<any> => {
  const response = await client.post<BackendResponse<any>>('/sales-returns', data);
  return response.data.data;
};

