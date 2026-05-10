import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingBag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sfOrderApi } from "../../api/index.js";
import { useAuthStore } from "../../stores/authStore.js";
import { format, isAfter, parseISO } from "date-fns";

const LS_KEY = "sf_orders_last_viewed";

function getLastViewed() {
  try {
    return localStorage.getItem(LS_KEY) ? new Date(localStorage.getItem(LS_KEY)) : null;
  } catch { return null; }
}
function setLastViewed() {
  try { localStorage.setItem(LS_KEY, new Date().toISOString()); } catch {}
}

const STATUS_DOT = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-400",
  processing: "bg-blue-400",
  ready: "bg-green-400",
  out_for_delivery: "bg-blue-400",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-400",
};

export default function NotificationBell() {
  const { isSuperAdmin } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [lastViewed, setLastViewedState] = useState(getLastViewed);
  const ref = useRef(null);
  const nav = useNavigate();

  // Only show for store admins/staff, not platform superAdmin
  const skip = isSuperAdmin();

  const { data } = useQuery({
    queryKey: ["sf-orders-notif"],
    queryFn: () => sfOrderApi.list({ limit: 8, page: 1 }),
    enabled: !skip,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const orders = data?.data ?? [];
  const unreadCount = lastViewed
    ? orders.filter(o => isAfter(parseISO(o.createdAt), lastViewed)).length
    : orders.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLastViewed(new Date());
    setLastViewedState(new Date());
  };

  const goToOrders = () => {
    setOpen(false);
    nav("/storefront-orders");
  };

  if (skip) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Storefront order notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ShoppingBag size={14} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Storefront Orders</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
              <X size={14} />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No orders yet</p>
            ) : orders.map(o => {
              const isNew = lastViewed ? isAfter(parseISO(o.createdAt), lastViewed) : false;
              return (
                <div
                  key={o._id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer ${isNew ? "bg-primary-50/60 dark:bg-primary-900/10" : ""}`}
                  onClick={goToOrders}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[o.status] || "bg-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 font-mono">{o.orderNumber}</span>
                      {isNew && <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-semibold px-1.5 py-0.5 rounded-full">New</span>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{o.customerName || "Unknown"}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{o.status?.replace(/_/g, " ")}</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{format(parseISO(o.createdAt), "dd MMM, h:mm a")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={goToOrders}
            className="w-full text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 py-3 border-t border-gray-100 dark:border-gray-700 transition-colors"
          >
            View all orders →
          </button>
        </div>
      )}
    </div>
  );
}
