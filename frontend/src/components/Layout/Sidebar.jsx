import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, BarChart3, FileText, Settings, Users, Truck, UserCircle, Layers, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { label: "Inventory", divider: true },
  { to: "/categories", icon: Layers, label: "Categories" },
  { to: "/products", icon: Package, label: "Products" },
  { label: "Transactions", divider: true },
  { to: "/purchases", icon: ShoppingCart, label: "Purchases" },
  { to: "/sales", icon: TrendingUp, label: "Sales" },
  { to: "/stock-adjustments", icon: ClipboardList, label: "Stock Adjust" },
  { label: "Stakeholders", divider: true },
  { to: "/suppliers", icon: Truck, label: "Suppliers" },
  { to: "/customers", icon: UserCircle, label: "Customers" },
  { label: "Finance", divider: true },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { label: "Admin", divider: true, adminOnly: true },
  { to: "/users", icon: Users, label: "Team", adminOnly: true },
  { to: "/settings", icon: Settings, label: "Settings", adminOnly: true },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { organization, isAdmin } = useAuthStore();
  
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-200 z-30",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center px-4 h-16 border-b border-gray-100", collapsed && "justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Package size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="ml-2.5 overflow-hidden">
            <p className="font-bold text-gray-900 text-sm truncate">{organization?.name || "Inventory"}</p>
            <p className="text-xs text-gray-400 capitalize truncate">{organization?.storeType || "store"}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.adminOnly && !isAdmin()) return null;
          if (item.divider) return (
            <div key={i} className={cn("pt-3 pb-1", collapsed && "hidden")}>
              <p className="text-xs font-semibold text-gray-400 uppercase px-2">{item.label}</p>
            </div>
          );
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : ""}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
