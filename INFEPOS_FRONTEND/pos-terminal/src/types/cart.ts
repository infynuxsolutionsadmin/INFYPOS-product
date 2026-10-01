import type { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  /** Line subtotal before VAT = unitPrice * quantity */
  lineTotal: number;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
}
