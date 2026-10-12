import client from './client';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  FindProductsQuery,
  PaginatedResponse,
  BackendResponse,
} from '../types/products';

export const getProducts = async (
  query?: FindProductsQuery
): Promise<PaginatedResponse<Product>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Product>>>('/products', {
    params: query,
  });
  return response.data.data;
};

export const getProduct = async (id: string): Promise<Product> => {
  const response = await client.get<BackendResponse<Product>>(`/products/${id}`);
  return response.data.data;
};

export const createProduct = async (data: CreateProductRequest): Promise<Product> => {
  const response = await client.post<BackendResponse<Product>>('/products', data);
  return response.data.data;
};

export const updateProduct = async (id: string, data: UpdateProductRequest): Promise<Product> => {
  const response = await client.patch<BackendResponse<Product>>(`/products/${id}`, data);
  return response.data.data;
};

export const deleteProduct = async (id: string, permanent: boolean = false): Promise<any> => {
  const url = permanent ? `/products/${id}?permanent=true` : `/products/${id}`;
  const response = await client.delete<BackendResponse<any>>(url);
  return response.data.data;
};

export const restoreProduct = async (id: string): Promise<Product> => {
  const response = await client.patch<BackendResponse<Product>>(`/products/${id}/restore`);
  return response.data.data;
};

export const permanentDeleteProduct = async (id: string): Promise<{ message: string; id: string }> => {
  const response = await client.delete<BackendResponse<{ message: string; id: string }>>(`/products/${id}/permanent`);
  return response.data.data;
};

export const deleteAllProducts = async (): Promise<{ deletedCount: number }> => {
  const response = await client.delete<BackendResponse<{ deletedCount: number }>>('/products/delete-all');
  return response.data.data;
};

export interface BulkImportResult {
  importedCount: number;
  skippedCount: number;
  totalProcessed: number;
  errors: string[];
}

export const bulkImportProducts = async (products: any[], targetStoreId?: string): Promise<BulkImportResult> => {
  const response = await client.post<BackendResponse<BulkImportResult>>('/products/bulk-import', { products, targetStoreId });
  return response.data.data;
};
