import { useOutletContext, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, Clock, CheckCircle, XCircle } from "lucide-react";
import { useCustomerStore } from "../../stores/storefrontStore.js";
import { format } from "date-fns";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  out_for_delivery: "bg-primary-50 text-primary-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const PAYMENT_STATUS_COLORS = {
  pending: "text-amber-600",
  paid: "text-emerald-600",
  failed: "text-red-600",
  refunded: "text-gray-600",
};

export default function CustomerAccountPage() {
  const { store, slug, api } = useOutletContext();
  const { customer, isAuthenticated } = useCustomerStore();
  const currencySymbol = store?.currencySymbol || "₹";

  if (!isAuthenticated) return <Navigate to={`/store/${slug}/login?next=/store/${slug}/account`} replace />;

  const { data, isLoading } = useQuery({
    queryKey: ["sf-my-orders", slug],
    queryFn: () => api.listOrders({ limit: 20 }),
  });

  const orders = data?.data ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
            {customer?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{customer?.name}</p>
            <p className="text-sm text-gray-500">{customer?.email}</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">My Orders</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Package size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-gray-400 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  {order.items.slice(0, 3).map((item, i) => (
                    <p key={i}>{item.name} × {item.qty}</p>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-gray-400">+{order.items.length - 3} more items</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      {order.fulfillmentType === "delivery" ? <MapPin size={12} /> : <Package size={12} />}
                      {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                    </span>
                    <span className={`capitalize font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                      {order.paymentMethod} · {order.paymentStatus}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">
                    {currencySymbol}{order.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
