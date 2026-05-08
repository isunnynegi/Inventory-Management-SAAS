import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Package, ChevronRight, ArrowRight, Tag } from "lucide-react";
import { useCartStore } from "../../stores/storefrontStore.js";
import toast from "react-hot-toast";

function ProductCard({ product, onAdd, currencySymbol, slug }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group flex-shrink-0 w-44">
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-gray-200" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-medium text-gray-900 text-xs leading-tight line-clamp-2 mb-1.5">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-900 text-sm">{currencySymbol}{product.sellingPrice.toLocaleString("en-IN")}</span>
          <button
            onClick={() => onAdd(product)}
            className="p-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            style={{ background: "var(--sf-primary, #4F46E5)" }}
            title="Add to cart"
          >
            <ShoppingCart size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ category, slug }) {
  return (
    <Link to={`/store/${slug}/products?categoryId=${category._id}`}
      className="group flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all text-center">
      <div className="w-14 h-14 rounded-xl bg-primary-50 overflow-hidden flex items-center justify-center"
        style={{ background: "color-mix(in srgb, var(--sf-primary, #4F46E5) 10%, white)" }}>
        {category.image ? (
          <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
        ) : (
          <Tag size={24} className="text-primary-600" style={{ color: "var(--sf-primary, #4F46E5)" }} />
        )}
      </div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-primary-600 line-clamp-2 leading-tight"
        style={{ "--tw-text-opacity": 1 }}>
        {category.name}
      </span>
    </Link>
  );
}

export default function StorefrontHomePage() {
  const { store, slug, api } = useOutletContext();
  const nav = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const currencySymbol = store?.currencySymbol || "₹";
  const branding = store?.branding || {};

  const { data: homepageData, isLoading } = useQuery({
    queryKey: ["sf-homepage", slug],
    queryFn: api.getHomepage,
    enabled: !!slug,
    staleTime: 3 * 60 * 1000,
  });

  const categories = homepageData?.data?.categories ?? [];
  const featuredProducts = homepageData?.data?.featuredProducts ?? [];
  const popularProducts = homepageData?.data?.popularProducts ?? [];

  const handleAdd = (product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`, { icon: "🛒" });
  };

  const heroBg = branding.bannerImage
    ? `url("${branding.bannerImage}")`
    : undefined;

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div
        className="relative rounded-2xl overflow-hidden min-h-[200px] flex items-center"
        style={{
          background: heroBg
            ? `linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.2)), ${heroBg}`
            : `linear-gradient(135deg, var(--sf-primary, #4F46E5) 0%, color-mix(in srgb, var(--sf-primary, #4F46E5) 70%, black) 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="px-8 py-10 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {branding.bannerTitle || store?.name}
          </h1>
          <p className="text-white/80 text-sm sm:text-base mb-6 max-w-md">
            {branding.bannerSubtitle || branding.tagline || "Browse our products and shop online"}
          </p>
          <Link
            to={`/store/${slug}/products`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            Shop Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Categories */}
      {(isLoading || categories.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Shop by Category</h2>
            <Link to={`/store/${slug}/products`} className="text-xs text-primary-600 flex items-center gap-1 hover:underline"
              style={{ color: "var(--sf-primary, #4F46E5)" }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {categories.map(c => <CategoryCard key={c._id} category={c} slug={slug} />)}
            </div>
          )}
        </section>
      )}

      {/* Featured products */}
      {(isLoading || featuredProducts.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Featured Products</h2>
            <Link to={`/store/${slug}/products`} className="text-xs text-primary-600 flex items-center gap-1 hover:underline"
              style={{ color: "var(--sf-primary, #4F46E5)" }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 animate-pulse h-56" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {featuredProducts.map(p => (
                <ProductCard key={p._id} product={p} onAdd={handleAdd} currencySymbol={currencySymbol} slug={slug} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Popular products */}
      {(isLoading || popularProducts.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Popular Products</h2>
            <Link to={`/store/${slug}/products`} className="text-xs text-primary-600 flex items-center gap-1 hover:underline"
              style={{ color: "var(--sf-primary, #4F46E5)" }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 animate-pulse h-56" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {popularProducts.map(p => (
                <div key={p._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} className="text-gray-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">{p.categoryId?.name || ""}</p>
                    <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 mb-2">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{currencySymbol}{p.sellingPrice.toLocaleString("en-IN")}</span>
                      <button onClick={() => handleAdd(p)}
                        className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        style={{ background: "var(--sf-primary, #4F46E5)" }}>
                        <ShoppingCart size={14} />
                      </button>
                    </div>
                    {p.stock <= 5 && <p className="text-[10px] text-amber-600 mt-1">Only {p.stock} left</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty state — no products at all */}
      {!isLoading && categories.length === 0 && featuredProducts.length === 0 && popularProducts.length === 0 && (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 font-medium">Store is being set up</p>
          <p className="text-gray-400 text-sm mt-1">Products will appear here soon</p>
        </div>
      )}
    </div>
  );
}
