import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { ProtectedRoute, PublicRoute } from "./components/RouteGuards.jsx";
import Layout from "./components/Layout/Layout.jsx";
import { useAuthStore } from "./stores/authStore.js";
import { authApi } from "./api/index.js";

import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import DashboardPage from "./pages/dashboard/DashboardPage.jsx";
import CategoriesPage from "./pages/categories/CategoriesPage.jsx";
import ProductsPage from "./pages/products/ProductsPage.jsx";
import SuppliersPage from "./pages/suppliers/SuppliersPage.jsx";
import CustomersPage from "./pages/customers/CustomersPage.jsx";
import PurchasesPage from "./pages/purchases/PurchasesPage.jsx";
import SalesPage from "./pages/sales/SalesPage.jsx";
import StockAdjustmentsPage from "./pages/stockAdjustments/StockAdjustmentsPage.jsx";
import InvoicesPage from "./pages/invoices/InvoicesPage.jsx";
import ReportsPage from "./pages/reports/ReportsPage.jsx";
import UsersPage from "./pages/users/UsersPage.jsx";
import SettingsPage from "./pages/settings/SettingsPage.jsx";
import OrganizationsPage from "./pages/organizations/OrganizationsPage.jsx";
import StorefrontOrdersPage from "./pages/storefrontOrders/StorefrontOrdersPage.jsx";
import StorefrontLayout from "./pages/store/StorefrontLayout.jsx";
import StorePage from "./pages/store/StorePage.jsx";
import CartPage from "./pages/store/CartPage.jsx";
import CheckoutPage from "./pages/store/CheckoutPage.jsx";
import OrderConfirmPage from "./pages/store/OrderConfirmPage.jsx";
import CustomerLoginPage from "./pages/store/CustomerLoginPage.jsx";
import CustomerRegisterPage from "./pages/store/CustomerRegisterPage.jsx";
import CustomerAccountPage from "./pages/store/CustomerAccountPage.jsx";
import StorefrontHomePage from "./pages/store/StorefrontHomePage.jsx";
import CouponsPage from "./pages/coupons/CouponsPage.jsx";
import SubscriptionPage from "./pages/settings/SubscriptionPage.jsx";
import SubscriptionsAdminPage from "./pages/settings/SubscriptionsAdminPage.jsx";
import FeatureGate from "./components/ui/FeatureGate.jsx";
import LandingPage from "./pages/landing/LandingPage.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

function SessionRestorer() {
  const { setAuth, clearAuth } = useAuthStore();
  useEffect(() => {
    let cancelled = false;
    authApi.getMe()
      .then(res => { if (!cancelled) setAuth({ user: res.data.user, organization: res.data.organization, accessToken: window.__accessToken || "" }); })
      .catch(() => { if (!cancelled) clearAuth(); });
    const h = () => clearAuth();
    window.addEventListener("auth:logout", h);
    return () => { cancelled = true; window.removeEventListener("auth:logout", h); };
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionRestorer />
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: "12px", fontSize: "14px" } }} />
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/suppliers" element={<FeatureGate feature="suppliers"><SuppliersPage /></FeatureGate>} />
              <Route path="/customers" element={<FeatureGate feature="customers"><CustomersPage /></FeatureGate>} />
              <Route path="/purchases" element={<FeatureGate feature="purchase"><PurchasesPage /></FeatureGate>} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />
              <Route path="/invoices" element={<FeatureGate feature="gst_invoice"><InvoicesPage /></FeatureGate>} />
              <Route path="/reports" element={<FeatureGate feature="data_export"><ReportsPage /></FeatureGate>} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/subscription" element={<SubscriptionPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<Layout />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/storefront-orders" element={<StorefrontOrdersPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute superAdminOnly />}>
            <Route element={<Layout />}>
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsAdminPage />} />
            </Route>
          </Route>
          {/* Public storefront — no auth required */}
          <Route path="/store/:slug" element={<StorefrontLayout />}>
            <Route index element={<StorefrontHomePage />} />
            <Route path="products" element={<StorePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order/:orderId" element={<OrderConfirmPage />} />
            <Route path="login" element={<CustomerLoginPage />} />
            <Route path="register" element={<CustomerRegisterPage />} />
            <Route path="account" element={<CustomerAccountPage />} />
          </Route>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
