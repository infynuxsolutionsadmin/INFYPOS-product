export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  vatRate: number;
  imageUrl: string | null;
  trackInventory: boolean;
  status: ProductStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FindProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  status?: ProductStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProducts {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BackendResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
}
