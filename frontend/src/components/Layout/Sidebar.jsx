import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, BarChart3, FileText,
  Settings, Users, Truck, UserCircle, Layers, ClipboardList, ChevronLeft,
  ChevronRight, Store, Scan, Building2, ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";

const SUPERADMIN_NAV = [
  {
    section: null,
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    section: "Platform",
    items: [
      { to: "/organizations", icon: Building2, label: "Organizations" },
      { to: "/users", icon: Users, label: "All Users" },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/settings", icon: Settings, label: "Platform Settings" },
    ],
  },
];

const STORE_NAV = [
  {
    section: null,
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    section: "Catalog",
    items: [
      { to: "/categories", icon: Layers, label: "Categories" },
      { to: "/products", icon: Package, label: "Inventory" },
    ],
  },
  {
    section: "Operations",
    items: [
      { to: "/sales",              icon: Scan,          label: "POS / Sales" },
      { to: "/purchases",          icon: ShoppingCart,  label: "Purchases" },
      { to: "/stock-adjustments",  icon: ClipboardList, label: "Stock Adjust" },
      { to: "/invoices",           icon: FileText,      label: "Invoices" },
    ],
  },
  {
    section: "Stakeholders",
    items: [
      { to: "/suppliers", icon: Truck,       label: "Suppliers" },
      { to: "/customers", icon: UserCircle,  label: "Customers" },
    ],
  },
  {
    section: "Analytics",
    items: [
      { to: "/reports", icon: BarChart3, label: "Reports" },
    ],
  },
  {
    section: "Settings",
    adminOnly: true,
    items: [
      { to: "/users",     icon: Users,    label: "Team & Permissions", adminOnly: true },
      { to: "/settings",  icon: Settings, label: "Store settings",     adminOnly: true },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, organization, isAdmin, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const nav = superAdmin ? SUPERADMIN_NAV : STORE_NAV;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-200 z-30 ${collapsed ? "w-16" : "w-[220px]"}`}>
      {/* Logo / identity chip */}
      <div className={`flex items-center h-[60px] border-b border-gray-100 dark:border-gray-800 flex-shrink-0 ${collapsed ? "justify-center px-3" : "px-4 gap-3"}`}>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${superAdmin ? "bg-violet-600" : "bg-primary-600"}`}>
          {superAdmin
            ? <ShieldCheck size={14} className="text-white" />
            : <Store size={14} className="text-white" />
          }
        </div>
        {!collapsed && (
          <div className="min-w-0">
            {superAdmin ? (
              <>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">StockKart</p>
                <p className="text-[10px] text-violet-500 font-medium truncate">Platform Admin</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{organization?.name || "StockKart"}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize truncate">{organization?.storeType || "store"}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {nav.map((group, gi) => {
          if (group.adminOnly && !isAdmin()) return null;
          const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin());
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi}>
              {group.section && !collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-2 mb-1">{group.section}</p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center rounded-lg text-[13px] font-medium transition-colors
                        ${collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-2.5 px-2.5 py-2"}
                        ${isActive
                          ? superAdmin
                            ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                            : "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                        }`
                      }
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  );
}
