import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setShopToken, getShopToken } from "../api/shopApi.js";

// ── Multi-store shopping cart ─────────────────────────────────────────────────
// Each item carries storeSlug/storeName so the cart can be grouped by store.
export const useShopCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem(product, storeCtx) {
        // storeCtx = { slug, name, id, currencySymbol }
        set(s => {
          const idx = s.items.findIndex(
            i => i.productId === (product._id || product.productId) && i.storeSlug === storeCtx.slug
          );
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = { ...items[idx], qty: Math.min(items[idx].qty + 1, items[idx].stock) };
            return { items };
          }
          return {
            items: [
              ...s.items,
              {
                productId:      product._id || product.productId,
                name:           product.name,
                image:          product.image || null,
                unitPrice:      product.sellingPrice ?? product.unitPrice,
                taxPercent:     product.taxPercent || 0,
                qty:            1,
                stock:          product.stock,
                storeSlug:      storeCtx.slug,
                storeName:      storeCtx.name,
                storeId:        storeCtx.id,
                currencySymbol: storeCtx.currencySymbol || "₹",
              },
            ],
          };
        });
      },

      updateQty(productId, storeSlug, qty) {
        set(s => ({
          items: s.items.map(i =>
            i.productId === productId && i.storeSlug === storeSlug
              ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) }
              : i
          ),
        }));
      },

      removeItem(productId, storeSlug) {
        set(s => ({ items: s.items.filter(i => !(i.productId === productId && i.storeSlug === storeSlug)) }));
      },

      clearStore(storeSlug) {
        set(s => ({ items: s.items.filter(i => i.storeSlug !== storeSlug) }));
      },

      clearAll() { set({ items: [] }); },

      itemsByStore() {
        const map = new Map();
        for (const item of get().items) {
          if (!map.has(item.storeSlug)) map.set(item.storeSlug, []);
          map.get(item.storeSlug).push(item);
        }
        return map;
      },

      subtotalForStore(storeSlug) {
        return get()
          .items.filter(i => i.storeSlug === storeSlug)
          .reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
      },

      get totalItemCount() { return get().items.reduce((s, i) => s + i.qty, 0); },
    }),
    { name: "shop_cart" }
  )
);

// ── Platform customer auth ────────────────────────────────────────────────────
export const useShopCustomerStore = create((set) => ({
  customer:        null,
  accessToken:     getShopToken(),
  isAuthenticated: !!getShopToken(),

  setCustomer({ customer, accessToken }) {
    setShopToken(accessToken);
    set({ customer, accessToken, isAuthenticated: true });
  },

  updateCustomer(partial) {
    set(s => ({ customer: s.customer ? { ...s.customer, ...partial } : s.customer }));
  },

  clearCustomer() {
    setShopToken(null);
    set({ customer: null, accessToken: null, isAuthenticated: false });
  },
}));
