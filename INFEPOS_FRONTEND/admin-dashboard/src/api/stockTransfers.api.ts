import client from './client';
import type {
  StockTransfer,
  CreateStockTransferRequest,
  UpdateStockTransferRequest,
  ReceiveStockTransferRequest,
  FindStockTransfersQuery,
} from '../types/stockTransfers';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getStockTransfers = async (
  query?: FindStockTransfersQuery
): Promise<PaginatedResponse<StockTransfer>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<StockTransfer>>>('/stock-transfers', {
    params: query,
  });
  return response.data.data;
};

export const getStockTransferById = async (id: string): Promise<StockTransfer> => {
  const response = await client.get<BackendResponse<StockTransfer>>(`/stock-transfers/${id}`);
  return response.data.data;
};

export const createStockTransfer = async (
  data: CreateStockTransferRequest
): Promise<StockTransfer> => {
  const response = await client.post<BackendResponse<StockTransfer>>('/stock-transfers', data);
  return response.data.data;
};

export const updateStockTransfer = async (
  id: string,
  data: UpdateStockTransferRequest
): Promise<StockTransfer> => {
  const response = await client.patch<BackendResponse<StockTransfer>>(`/stock-transfers/${id}`, data);
  return response.data.data;
};

export const shipStockTransfer = async (id: string): Promise<StockTransfer> => {
  const response = await client.patch<BackendResponse<StockTransfer>>(`/stock-transfers/${id}/ship`);
  return response.data.data;
};

export const receiveStockTransfer = async (
  id: string,
  data: ReceiveStockTransferRequest
): Promise<StockTransfer> => {
  const response = await client.patch<BackendResponse<StockTransfer>>(`/stock-transfers/${id}/receive`, data);
  return response.data.data;
};

export const deleteStockTransfer = async (id: string): Promise<StockTransfer> => {
  const response = await client.delete<BackendResponse<StockTransfer>>(`/stock-transfers/${id}`);
  return response.data.data;
};
