import { Bell, LogOut, User, ChevronDown, ShieldCheck, UserX, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useThemeStore } from "../../stores/themeStore.js";
import { useNavigate } from "react-router-dom";
import { authApi, orgApi } from "../../api/index.js";
import toast from "react-hot-toast";

export default function Header({ sidebarWidth }) {
  const { user, clearAuth, isSuperAdmin, impersonating, impersonatedOrgName, stopImpersonation, updateOrg } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const superAdmin = isSuperAdmin();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const logout = async () => {
    try { await authApi.logout({}); } catch {}
    clearAuth();
    nav("/login");
    toast.success("Logged out");
  };

  const exitImpersonation = async () => {
    stopImpersonation();
    try {
      const res = await orgApi.get();
      updateOrg(res.data);
    } catch {}
    nav("/organizations");
    toast.success("Returned to super admin");
  };

  return (
    <header className="fixed top-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-col z-20 transition-all duration-200" style={{ left: sidebarWidth }}>
      {impersonating && (
        <div className="bg-amber-500 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between gap-3">
          <span>Impersonating <strong>{impersonatedOrgName}</strong> — changes affect this store</span>
          <button onClick={exitImpersonation} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 transition">
            <UserX size={12} /> Exit
          </button>
        </div>
      )}
      <div className="h-[60px] flex items-center justify-between px-6">
        <div />
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell size={18} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${superAdmin ? "bg-violet-600" : "bg-primary-600"}`}>
                {superAdmin
                  ? <ShieldCheck size={14} className="text-white" />
                  : <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">{user?.name}</p>
                <p className={`text-xs capitalize font-medium ${superAdmin ? "text-violet-500" : "text-gray-400 dark:text-gray-500"}`}>
                  {superAdmin ? "Platform Admin" : user?.role}
                </p>
              </div>
              <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                <button onClick={() => { nav("/settings"); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <User size={14} /> Profile & Settings
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button onClick={logout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
