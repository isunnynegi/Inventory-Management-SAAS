import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],   // [{ productId, name, sku, image, unitPrice, taxPercent, qty, stock }]
  setItems: (items) => set({ items }),
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
}));

const SF_TOKEN_KEY = "_sf_at";

export const useCustomerStore = create((set) => ({
  customer: null,
  accessToken: null,
  isAuthenticated: false,
  setCustomer: ({ customer, accessToken }) => {
    window.__sfAccessToken = accessToken;
    if (accessToken) sessionStorage.setItem(SF_TOKEN_KEY, accessToken);
    set({ customer, accessToken, isAuthenticated: true });
  },
  updateCustomer: (customer) => set(s => ({ customer: { ...s.customer, ...customer } })),
  clearCustomer: () => {
    window.__sfAccessToken = null;
    sessionStorage.removeItem(SF_TOKEN_KEY);
    set({ customer: null, accessToken: null, isAuthenticated: false });
  },
}));
