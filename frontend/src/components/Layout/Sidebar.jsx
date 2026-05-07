import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, BarChart3, FileText,
  Settings, Users, Truck, UserCircle, Layers, ClipboardList, ChevronLeft,
  ChevronRight, Store, Scan,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";

// Nav sections matching the design reference role-based structure
const NAV = [
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
      { to: "/sales", icon: Scan, label: "POS / Sales" },
      { to: "/purchases", icon: ShoppingCart, label: "Purchases" },
      { to: "/stock-adjustments", icon: ClipboardList, label: "Stock Adjust" },
      { to: "/invoices", icon: FileText, label: "Invoices" },
    ],
  },
  {
    section: "Stakeholders",
    items: [
      { to: "/suppliers", icon: Truck, label: "Suppliers" },
      { to: "/customers", icon: UserCircle, label: "Customers" },
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
      { to: "/users", icon: Users, label: "Team & Permissions", adminOnly: true },
      { to: "/settings", icon: Settings, label: "Store settings", adminOnly: true },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { organization, isAdmin } = useAuthStore();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-200 z-30 ${collapsed ? "w-16" : "w-[220px]"}`}>
      {/* Logo / tenant chip */}
      <div className={`flex items-center h-[60px] border-b border-gray-100 flex-shrink-0 ${collapsed ? "justify-center px-3" : "px-4 gap-3"}`}>
        <div className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Store size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{organization?.name || "StockKart"}</p>
            <p className="text-[10px] text-gray-400 capitalize truncate">{organization?.storeType || "store"}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group, gi) => {
          if (group.adminOnly && !isAdmin()) return null;
          const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin());
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi}>
              {group.section && !collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{group.section}</p>
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
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
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
        className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  );
}
