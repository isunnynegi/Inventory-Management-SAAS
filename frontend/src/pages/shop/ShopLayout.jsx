import { useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Package, Store } from "lucide-react";
import { useShopCartStore, useShopCustomerStore } from "../../stores/shopStore.js";
import { shopApi } from "../../api/shopApi.js";
import toast from "react-hot-toast";

export default function ShopLayout() {
  const { totalItemCount } = useShopCartStore();
  const { customer, isAuthenticated, setCustomer, clearCustomer } = useShopCustomerStore();
  const nav = useNavigate();

  // Restore session on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    shopApi.getMe()
      .then(res => setCustomer({ customer: res.data, accessToken: window.__shopAccessToken || "" }))
      .catch(() => clearCustomer());
  }, []);

  useEffect(() => {
    const h = () => clearCustomer();
    window.addEventListener("shop:logout", h);
    return () => window.removeEventListener("shop:logout", h);
  }, []);

  const handleLogout = async () => {
    try { await shopApi.logout(); } catch (_) {}
    clearCustomer();
    toast.success("Signed out");
    nav("/shop");
  };

  const itemCount = useShopCartStore(s => s.items.reduce((acc, i) => acc + i.qty, 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <Store size={22} />
            <span>StockKart Market</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link to="/shop/cart" className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors">
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/shop/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  <User size={15} />
                  <span className="hidden sm:inline">{customer?.name?.split(" ")[0]}</span>
                </Link>
                <button onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/shop/login"
                className="px-4 py-1.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-1.5">
          <Package size={12} />
          StockKart Market — shop from all your favourite stores in one place
        </div>
      </footer>
    </div>
  );
}
