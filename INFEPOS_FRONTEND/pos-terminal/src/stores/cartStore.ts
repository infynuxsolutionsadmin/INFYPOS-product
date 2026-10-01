import { create } from 'zustand';
import type { Product } from '../types/product';
import type { CartItem, CartSummary } from '../types/cart';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  getSummary: () => CartSummary;
}

const buildCartItem = (product: Product, quantity: number): CartItem => {
  const unitPrice = Number(product.sellingPrice);
  return {
    product,
    quantity,
    unitPrice,
    lineTotal: parseFloat((unitPrice * quantity).toFixed(2)),
  };
};

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  addItem: (product: Product) => {
    const existing = get().items.find((i) => i.product.id === product.id);
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === product.id
            ? buildCartItem(product, i.quantity + 1)
            : i
        ),
      }));
    } else {
      set((state) => ({
        items: [...state.items, buildCartItem(product, 1)],
      }));
    }
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? buildCartItem(i.product, quantity)
          : i
      ),
    }));
  },

  incrementQuantity: (productId: string) => {
    const item = get().items.find((i) => i.product.id === productId);
    if (item) {
      get().updateQuantity(productId, item.quantity + 1);
    }
  },

  decrementQuantity: (productId: string) => {
    const item = get().items.find((i) => i.product.id === productId);
    if (item) {
      get().updateQuantity(productId, item.quantity - 1);
    }
  },

  clearCart: () => set({ items: [] }),

  getSummary: (): CartSummary => {
    const items = get().items;
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalVat = items.reduce((sum, i) => {
      const vatRate = Number(i.product.vatRate) / 100;
      return sum + i.lineTotal * vatRate;
    }, 0);
    const grandTotal = subtotal + totalVat;
    return {
      itemCount,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalVat: parseFloat(totalVat.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    };
  },
}));
