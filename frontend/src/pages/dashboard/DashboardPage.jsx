import { useAuthStore } from "../../stores/authStore.js";
import SuperAdminDashboard from "./SuperAdminDashboard.jsx";
import StoreDashboard from "./StoreDashboard.jsx";

export default function DashboardPage() {
  const { isSuperAdmin } = useAuthStore();
  return isSuperAdmin() ? <SuperAdminDashboard /> : <StoreDashboard />;
}
