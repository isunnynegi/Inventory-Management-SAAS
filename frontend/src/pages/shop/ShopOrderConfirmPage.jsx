import { useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Package, MapPin, Store, Clock } from "lucide-react";
import { storeApi } from "../../api/storefront.js";

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  out_for_delivery: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function ShopOrderConfirmPage() {
  const { slug, orderId } = useParams();
  const [searchParams] = useSearchParams();
  const isPaymentReturn = searchParams.get("payment") === "done";
  const qc = useQueryClient();
  const api = storeApi(slug);

  const { data, refetch } = useQuery({
    queryKey: ["shop-order", orderId],
    queryFn: () => api.getOrder(orderId),
  });

  useEffect(() => {
    if (!isPaymentReturn) return;
    const t = setInterval(() => refetch(), 3000);
    return () => clearInterval(t);
  }, [isPaymentReturn]);

  const order = data?.data;
  if (!order) return (
    <div className="text-center py-16">
      <Clock size={40} className="mx-auto mb-3 text-gray-200 animate-spin" />
      <p className="text-gray-400">Loading order…</p>
    </div>
  );

  const currencySymbol = "₹";

  return (
    <div className="max-w-xl mx-auto py-4 space-y-4">
      {/* Success header */}
      <div className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-100">
        <CheckCircle size={40} className="mx-auto mb-2 text-emerald-500" />
        <h1 className="text-lg font-bold text-gray-900">Order placed!</h1>
        <p className="text-sm text-gray-500 mt-1">Order #{order.orderNumber}</p>
        <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
          {order.status?.replace(/_/g, " ")}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Items</h2>
        <div className="space-y-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between items-start text-sm">
              <div>
                <p className="text-gray-900 font-medium">{item.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.qty} × {currencySymbol}{item.unitPrice?.toLocaleString("en-IN")}</p>
              </div>
              <span className="font-medium text-gray-900">{currencySymbol}{item.lineTotal?.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{currencySymbol}{order.subtotal?.toLocaleString("en-IN")}</span></div>
          {order.taxTotal > 0 && <div className="flex justify-between text-xs text-gray-400"><span>GST</span><span>+{currencySymbol}{order.taxTotal?.toFixed(2)}</span></div>}
          {order.deliveryCharge > 0 && <div className="flex justify-between text-xs text-gray-400"><span>Delivery</span><span>+{currencySymbol}{order.deliveryCharge}</span></div>}
          <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{currencySymbol}{order.totalAmount?.toLocaleString("en-IN")}</span></div>
        </div>
      </div>

      {/* Fulfillment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          {order.fulfillmentType === "delivery" ? <MapPin size={15} className="text-primary-600" /> : <Store size={15} className="text-primary-600" />}
          <h2 className="font-semibold text-gray-900 text-sm">{order.fulfillmentType === "delivery" ? "Home Delivery" : "Store Pickup"}</h2>
        </div>
        {order.fulfillmentType === "delivery" && order.deliveryAddress && (
          <p className="text-sm text-gray-500">
            {order.deliveryAddress.name} · {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.zip}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/shop/cart" className="flex-1 py-2.5 text-center text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
          Back to cart
        </Link>
        <Link to="/shop/account" className="flex-1 py-2.5 text-center text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
          View my orders
        </Link>
      </div>
    </div>
  );
}
