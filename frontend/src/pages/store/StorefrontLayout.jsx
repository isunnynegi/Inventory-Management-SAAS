import { Outlet, Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, User, LogOut, Store, Menu, X, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { storeApi } from "../../api/storefront.js";
import { useCartStore, useCustomerStore } from "../../stores/storefrontStore.js";
import toast from "react-hot-toast";

export default function StorefrontLayout() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { customer, isAuthenticated, clearCustomer } = useCustomerStore();
  const itemCount = useCartStore(s => s.items.reduce((a, i) => a + i.qty, 0));

  const api = storeApi(slug);

  const { data: storeData, isError } = useQuery({
    queryKey: ["store-info", slug],
    queryFn: api.getInfo,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const store = storeData?.data;

  // Restore customer session from cookie
  useEffect(() => {
    if (!window.__sfAccessToken) {
      api.getMe()
        .then(res => useCustomerStore.getState().setCustomer({ customer: res.data, accessToken: window.__sfAccessToken || "" }))
        .catch(() => {});
    }
  }, [slug]);

  // Listen for logout events
  useEffect(() => {
    const h = () => clearCustomer();
    window.addEventListener("sf:logout", h);
    return () => window.removeEventListener("sf:logout", h);
  }, []);

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    clearCustomer();
    toast.success("Logged out");
    nav(`/store/${slug}`);
  };

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Store size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold text-gray-800">Store not found</h1>
          <p className="text-gray-500 mt-1">This store doesn't exist or is currently unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo / store name */}
            <Link to={`/store/${slug}`} className="flex items-center gap-2 font-bold text-gray-900">
              {store?.logo ? (
                <img src={store.logo} alt={store?.name} className="h-8 w-8 rounded object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {(store?.name || slug)[0]?.toUpperCase()}
                </div>
              )}
              <span className="hidden sm:block text-base">{store?.name || slug}</span>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Cart */}
              <Link to={`/store/${slug}/cart`}
                className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <User size={16} />
                    <span className="hidden sm:block max-w-[100px] truncate">{customer?.name}</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 hidden group-hover:block z-50">
                    <Link to={`/store/${slug}/account`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={14} /> My Orders
                    </Link>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <Link to={`/store/${slug}/login`}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Outlet context={{ store, slug, api }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12 py-6 text-center text-xs text-gray-400">
        {store?.name} · Powered by StockKart
      </footer>
    </div>
  );
}
