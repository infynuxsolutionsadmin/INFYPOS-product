import client from './client';
import type { CreateSaleRequest, Sale } from '../types/sale';
import type { BackendResponse } from '../types/product';

import { queueSyncEvent, isDesktopApp } from '../services/localDb';

export const createSale = async (data: CreateSaleRequest): Promise<Sale> => {
  if (isDesktopApp()) {
    // 1. Queue it locally for background sync
    const eventId = await queueSyncEvent('SALE', data);
    
    // Calculate totals loosely for mock
    let grandTotal = data.payments.reduce((acc, p) => acc + p.amount, 0);

    // 2. Mock a successful sale response so the UI clears the basket immediately
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
      }))
    };
    
    // 3. Try to sync immediately if online, but don't block the UI if it fails
    client.post<BackendResponse<Sale>>('/sales', data)
      .then(() => {
        console.log('Sale synced to cloud instantly');
      })
      .catch(err => {
        console.log('Sale queued for offline sync:', err.message);
      });
      
    return mockSale;
  }

  // Fallback for Web/Browser testing (non-Electron)
  const response = await client.post<BackendResponse<Sale>>('/sales', data);
  return response.data.data;
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

