import { Bell, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";

export default function Header({ sidebarWidth }) {
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const logout = async () => {
    try { await authApi.logout({}); } catch {}
    clearAuth();
    nav("/login");
    toast.success("Logged out");
  };

  return (
    <header className="fixed top-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-20 transition-all duration-200" style={{ left: sidebarWidth }}>
      <div />
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
          <Bell size={18} />
        </button>
        <div className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-gray-50 transition">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <button onClick={() => { nav("/settings"); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <User size={14} /> Profile & Settings
              </button>
              <hr className="my-1 border-gray-100" />
              <button onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
