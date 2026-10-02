import client from './client';
import type { Product, FindProductsQuery, PaginatedProducts, BackendResponse } from '../types/product';
import { isDesktopApp, queryLocalDb, syncProductsToLocalDb } from '../services/localDb';

/**
 * GET /products
 * Query params: page, limit, search, category, brand, status, sortBy, sortOrder
 * Requires permission: products.read
 */
export const getProducts = async (query?: FindProductsQuery): Promise<PaginatedProducts> => {
  if (isDesktopApp()) {
    const limit = query?.limit || 24;
    const page = query?.page || 1;
    const offset = (page - 1) * limit;
    const search = query?.search?.toLowerCase() || '';
    const category = query?.category || '';

    let sql = 'SELECT * FROM products WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(barcode) LIKE ? OR LOWER(categoryId) LIKE ?)';
      countSql += ' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(barcode) LIKE ? OR LOWER(categoryId) LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    
    if (category) {
      sql += ' AND categoryId = ?';
      countSql += ' AND categoryId = ?';
      params.push(category);
    }

    sql += ' LIMIT ? OFFSET ?';
    
    try {
      const items = await queryLocalDb(sql, ...params, limit, offset);
      const [{ total }] = await queryLocalDb(countSql, ...params);
      
      // Auto-sync catalog from cloud if local DB is completely empty
      if (total === 0 && !search && !category && isDesktopApp()) {
        console.log('Local catalog is empty, fetching from cloud...');
        try {
          const response = await client.get<BackendResponse<PaginatedProducts>>('/products', {
            params: { status: 'ACTIVE', limit: 10000 },
          });
          const cloudItems = response.data.data.items;
          
          if (cloudItems && cloudItems.length > 0) {
            await syncProductsToLocalDb(cloudItems);
            
            // Return the cloud items immediately for this request
            return {
              items: cloudItems.slice(0, limit),
              pagination: {
                total: cloudItems.length,
                pages: Math.ceil(cloudItems.length / limit),
                page: 1,
                limit
              }
            };
          }
        } catch (cloudErr) {
          console.error('Failed to auto-sync catalog from cloud:', cloudErr);
        }
      }

      return {
        items: items.map((row: any) => ({
          ...row,
          sellingPrice: row.price,
          category: row.categoryId
        })),
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit
        }
      };
    } catch (err) {
      console.error('Local DB products search failed:', err);
      // Fallback to online API if local db fails
    }
  }

  const response = await client.get<BackendResponse<PaginatedProducts>>('/products', {
    params: {
      ...query,
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
