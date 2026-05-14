import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store, Package, ChevronRight, Truck, ShoppingBag } from "lucide-react";
import { shopApi } from "../../api/shopApi.js";

function StoreCard({ store }) {
  const bg = store.branding?.primaryColor || "#4F46E5";
  const initials = (store.name || "S").substring(0, 2).toUpperCase();
  return (
    <Link to={`/shop/store/${store.slug}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group flex flex-col">
      {/* Banner */}
      <div className="h-28 flex items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${bg}22 0%, ${bg}44 100%)` }}>
        {store.logo ? (
          <img src={store.logo} alt={store.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" />
        ) : (
          <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm"
            style={{ backgroundColor: bg }}>
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 group-hover:text-primary-600 transition-colors">
          {store.name}
        </h3>
        {store.branding?.tagline && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-1">{store.branding.tagline}</p>
        )}
        <div className="flex items-center gap-3 mt-auto">
          {store.deliveryEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <Truck size={10} /> Delivery
            </span>
          )}
          {store.pickupEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
              <ShoppingBag size={10} /> Pickup
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{store.currencySymbol}</span>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-600 transition-colors" />
      </div>
    </Link>
  );
}

export default function ShopHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["shop-stores"],
    queryFn: shopApi.listStores,
    staleTime: 5 * 60 * 1000,
  });

  const stores = data?.data ?? [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Store size={28} />
          <h1 className="text-2xl font-bold">StockKart Market</h1>
        </div>
        <p className="text-primary-100 text-sm max-w-md mx-auto">
          Shop from all your favourite local stores in one place. Add to cart from multiple stores and checkout store-by-store.
        </p>
      </div>

      {/* Stores grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary-600" />
          All Stores
          {!isLoading && <span className="text-xs text-gray-400 font-normal">({stores.length})</span>}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
                <div className="h-28 bg-gray-100 rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400">No stores available right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {stores.map(s => <StoreCard key={s.id || s.slug} store={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
