import { create } from "zustand";
import { persist } from "zustand/middleware";

// Cart is persisted per-slug in localStorage
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],   // [{ productId, name, sku, image, unitPrice, taxPercent, qty, stock }]
      addItem: (product, qty = 1) => set(state => {
        const existing = state.items.find(i => i.productId === product._id);
        if (existing) {
          const newQty = Math.min(existing.qty + qty, product.stock);
          return { items: state.items.map(i => i.productId === product._id ? { ...i, qty: newQty } : i) };
        }
        return {
          items: [...state.items, {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            image: product.image,
            unitPrice: product.sellingPrice,
            taxPercent: product.taxPercent || 0,
            qty: Math.min(qty, product.stock),
            stock: product.stock,
          }],
        };
      }),
      updateQty: (productId, qty) => set(state => {
        if (qty <= 0) return { items: state.items.filter(i => i.productId !== productId) };
        return { items: state.items.map(i => i.productId === productId ? { ...i, qty: Math.min(qty, i.stock) } : i) };
      }),
      removeItem: (productId) => set(state => ({ items: state.items.filter(i => i.productId !== productId) })),
      clearCart: () => set({ items: [] }),
      get subtotal() { return get().items.reduce((s, i) => s + i.unitPrice * i.qty, 0); },
      get itemCount() { return get().items.reduce((s, i) => s + i.qty, 0); },
    }),
    { name: "sf-cart" }
  )
);

// Customer auth state (not persisted — restored via refresh token cookie)
export const useCustomerStore = create((set) => ({
  customer: null,
  accessToken: null,
  isAuthenticated: false,
  setCustomer: ({ customer, accessToken }) => {
    window.__sfAccessToken = accessToken;
    set({ customer, accessToken, isAuthenticated: true });
  },
  clearCustomer: () => {
    window.__sfAccessToken = null;
    set({ customer: null, accessToken: null, isAuthenticated: false });
  },
}));
