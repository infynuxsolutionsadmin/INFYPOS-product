import client from './client';
import type {
  GoodsReceipt,
  CreateGoodsReceiptPayload,
  FindGoodsReceiptsQuery,
} from '../types/goodsReceipts';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getGoodsReceipts = async (
  query?: FindGoodsReceiptsQuery
): Promise<PaginatedResponse<GoodsReceipt>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<GoodsReceipt>>>('/goods-receipts', {
    params: query,
  });
  return response.data.data;
};

export const getGoodsReceiptById = async (id: string): Promise<GoodsReceipt> => {
  const response = await client.get<BackendResponse<GoodsReceipt>>(`/goods-receipts/${id}`);
  return response.data.data;
};

export const createGoodsReceipt = async (data: CreateGoodsReceiptPayload): Promise<GoodsReceipt> => {
  const response = await client.post<BackendResponse<GoodsReceipt>>('/goods-receipts', data);
  return response.data.data;
};
