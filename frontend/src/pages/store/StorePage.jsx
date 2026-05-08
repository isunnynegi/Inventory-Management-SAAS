import { useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart, Package, Tag } from "lucide-react";
import { useCartStore } from "../../stores/storefrontStore.js";
import toast from "react-hot-toast";

function ProductCard({ product, onAdd, currencySymbol }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-gray-200" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-gray-400 mb-0.5">{product.categoryId?.name || ""}</p>
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 mb-2">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-900">{currencySymbol}{product.sellingPrice.toLocaleString("en-IN")}</span>
            {product.taxPercent > 0 && (
              <span className="text-[10px] text-gray-400 ml-1">+{product.taxPercent}% GST</span>
            )}
          </div>
          <button
            onClick={() => onAdd(product)}
            className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            title="Add to cart"
          >
            <ShoppingCart size={14} />
          </button>
        </div>
        {product.stock <= 5 && (
          <p className="text-[10px] text-amber-600 mt-1">Only {product.stock} left</p>
        )}
      </div>
    </div>
  );
}

export default function StorePage() {
  const { store, slug, api } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const [page, setPage] = useState(1);
  const addItem = useCartStore(s => s.addItem);

  const { data: catData } = useQuery({
    queryKey: ["sf-categories", slug],
    queryFn: api.listCategories,
    enabled: !!slug,
  });
  const categories = catData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["sf-products", slug, search, categoryId, page],
    queryFn: () => api.listProducts({ search: search || undefined, categoryId: categoryId || undefined, page, limit: 24 }),
    enabled: !!slug,
    keepPreviousData: true,
  });

  const products = data?.data ?? [];
  const meta = data?.meta ?? {};
  const currencySymbol = store?.currencySymbol || "₹";

  const handleAdd = (product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`, { icon: "🛒" });
  };

  return (
    <div className="space-y-5">
      {/* Hero / search bar */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold mb-1">{store?.name}</h1>
        <p className="text-primary-100 text-sm mb-4">Browse our products and shop online</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full max-w-md pl-9 pr-4 py-2 rounded-lg text-gray-900 text-sm outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setCategoryId(""); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryId === "" ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"}`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c._id}
              onClick={() => { setCategoryId(c._id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryId === c._id ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
          <p className="text-gray-400">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map(p => (
              <ProductCard key={p._id} product={p} onAdd={handleAdd} currencySymbol={currencySymbol} />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
