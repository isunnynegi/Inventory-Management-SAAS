import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { Spinner } from "./ui/index.jsx";

export function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
