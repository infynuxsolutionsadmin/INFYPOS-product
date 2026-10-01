import client from './client';
import type { Product, FindProductsQuery, PaginatedProducts, BackendResponse } from '../types/product';

/**
 * GET /products
 * Query params: page, limit, search, category, brand, status, sortBy, sortOrder
 * Requires permission: products.read
 */
export const getProducts = async (query?: FindProductsQuery): Promise<PaginatedProducts> => {
  const response = await client.get<BackendResponse<PaginatedProducts>>('/products', {
    params: {
      ...query,
      // POS always lists ACTIVE products only when no status filter given
      status: query?.status ?? 'ACTIVE',
      limit: query?.limit ?? 50,
    },
  });
  return response.data.data;
};

/**
 * GET /products/:id
 * Requires permission: products.read
 */
export const getProduct = async (id: string): Promise<Product> => {
  const response = await client.get<BackendResponse<Product>>(`/products/${id}`);
  return response.data.data;
};
