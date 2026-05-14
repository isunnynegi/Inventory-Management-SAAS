import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, ShoppingCart, Package, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { storeApi } from "../../api/storefront.js";
import { useShopCartStore } from "../../stores/shopStore.js";
import toast from "react-hot-toast";

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0 pb-4 mb-4 last:mb-0 last:pb-0">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-sm font-semibold text-gray-800 mb-2">
        {title}
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}

function ProductCard({ product, onAdd, currencySymbol }) {
  const outOfStock = product.stock <= 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group flex flex-col">
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        {product.image ? (
          <img src={product.image} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-gray-200" />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full shadow-sm">Out of stock</span>
          </div>
        )}
        {!outOfStock && product.stock <= 5 && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Only {product.stock} left
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-gray-400 mb-0.5">{product.categoryId?.name || ""}</p>
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 mb-2 flex-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="font-bold text-gray-900">{currencySymbol}{product.sellingPrice?.toLocaleString("en-IN")}</span>
            {product.taxPercent > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">+{product.taxPercent}% GST</span>
            )}
          </div>
          <button onClick={() => !outOfStock && onAdd(product)} disabled={outOfStock}
            className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Add to cart">
            <ShoppingCart size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShopStorePage() {
  const { slug } = useParams();
  const api = useCallback(storeApi(slug), [slug]);
  const addItem = useShopCartStore(s => s.addItem);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStock, setInStock] = useState(true);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: storeData } = useQuery({ queryKey: ["shop-store-info", slug], queryFn: api.getInfo });
  const { data: catData } = useQuery({ queryKey: ["shop-cats", slug], queryFn: api.listCategories });
  const { data: filterData } = useQuery({ queryKey: ["shop-filter", slug], queryFn: api.filterOptions });

  const store = storeData?.data;
  const categories = catData?.data ?? [];
  const brands = filterData?.data?.brands ?? [];
  const priceRange = filterData?.data?.priceRange ?? { min: 0, max: 10000 };
  const currencySymbol = store?.currencySymbol || "₹";

  const { data, isLoading } = useQuery({
    queryKey: ["shop-products", slug, search, categoryId, brand, minPrice, maxPrice, inStock, page],
    queryFn: () => api.listProducts({ search: search || undefined, categoryId: categoryId || undefined,
      brand: brand || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined,
      inStock: inStock ? undefined : "false", page, limit: 24 }),
    keepPreviousData: true,
  });

  const products = data?.data ?? [];
  const meta = data?.meta ?? {};
  const hasActiveFilters = categoryId || brand || minPrice || maxPrice || !inStock;
  const activeFilterCount = [categoryId, brand, minPrice || maxPrice, !inStock].filter(Boolean).length;

  const resetFilters = () => { setCategoryId(""); setBrand(""); setMinPrice(""); setMaxPrice(""); setInStock(true); setPage(1); };

  const handleAdd = (product) => {
    if (!store) return;
    addItem(product, { slug, name: store.name, id: store.id, currencySymbol });
    toast.success(`${product.name} added to cart`, { icon: "🛒" });
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && <button onClick={resetFilters} className="text-xs text-primary-600 hover:underline">Clear all</button>}
      </div>
      <FilterSection title="Availability">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={e => { setInStock(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded border-gray-300 accent-primary-600" />
          <span className="text-sm text-gray-700">In stock only</span>
        </label>
      </FilterSection>
      {categories.length > 0 && (
        <FilterSection title="Category">
          <div className="space-y-1.5">
            {[{ _id: "", name: "All categories" }, ...categories].map(c => (
              <label key={c._id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="category" checked={categoryId === c._id}
                  onChange={() => { setCategoryId(c._id); setPage(1); }} className="w-4 h-4 accent-primary-600" />
                <span className="text-sm text-gray-700">{c.name}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
      {brands.length > 0 && (
        <FilterSection title="Brand">
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {[{ value: "", label: "All brands" }, ...brands.map(b => ({ value: b, label: b }))].map(b => (
              <label key={b.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="brand" checked={brand === b.value}
                  onChange={() => { setBrand(b.value); setPage(1); }} className="w-4 h-4 accent-primary-600" />
                <span className="text-sm text-gray-700">{b.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
      <FilterSection title="Price Range">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Min ({currencySymbol})</label>
            <input type="number" min="0" placeholder={priceRange.min} value={minPrice}
              onChange={e => { setMinPrice(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400" />
          </div>
          <span className="text-gray-400 mt-5">—</span>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Max ({currencySymbol})</label>
            <input type="number" min="0" placeholder={priceRange.max} value={maxPrice}
              onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400" />
          </div>
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="space-y-5">
      <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> All stores
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold mb-1">{store?.name || slug}</h1>
        <p className="text-primary-100 text-sm mb-4">Browse and add products to your cart</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full max-w-lg pl-9 pr-4 py-2 rounded-lg text-gray-900 text-sm outline-none"
            placeholder="Search products…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <button onClick={() => setSidebarOpen(v => !v)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <SlidersHorizontal size={15} /> Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-xs text-primary-600 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 overflow-y-auto p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">Filters</span>
              <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-4">
          <FilterPanel />
        </aside>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-3">
            {isLoading ? "Loading…" : `${meta.totalDocs ?? products.length} product${(meta.totalDocs ?? products.length) !== 1 ? "s" : ""}`}
          </p>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 animate-pulse">
                  <div className="aspect-square bg-gray-100 rounded-t-xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 mb-2">No products found</p>
              {hasActiveFilters && <button onClick={resetFilters} className="text-sm text-primary-600 hover:underline">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => (
                  <ProductCard key={p._id} product={p} onAdd={handleAdd} currencySymbol={currencySymbol} />
                ))}
              </div>
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
                  <span className="text-sm text-gray-500">Page {page} of {meta.totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
