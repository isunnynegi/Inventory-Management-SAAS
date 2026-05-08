import { useState } from "react";
import { useParams, useOutletContext, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Package, MapPin, Store, Clock, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

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

export default function OrderConfirmPage() {
  const { orderId } = useParams();
  const { store, slug, api } = useOutletContext();
  const [searchParams] = useSearchParams();
  const paymentDone = searchParams.get("payment") === "done";
  const currencySymbol = store?.currencySymbol || "₹";

  const [utr, setUtr] = useState("");
  const [utrSubmitted, setUtrSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sf-order", orderId],
    queryFn: () => api.getOrder(orderId),
    refetchInterval: paymentDone ? 3000 : false,
  });

  const order = data?.data;

  const submitUtr = useMutation({
    mutationFn: () => api.submitUtr({ orderId, utrNumber: utr }),
    onSuccess: () => {
      toast.success("UTR submitted! Store will verify and confirm your order.");
      setUtrSubmitted(true);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to submit UTR"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Order not found.</p>
        <Link to={`/store/${slug}`} className="text-primary-600 text-sm hover:underline mt-2 block">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Success header */}
      <div className="text-center py-6">
        <CheckCircle size={56} className="mx-auto mb-3 text-emerald-500" />
        <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
        <p className="text-gray-500 mt-1">Order #{order.orderNumber}</p>
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* UPI UTR entry */}
      {order.paymentMethod === "upi" && order.paymentStatus !== "paid" && !utrSubmitted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Smartphone size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Complete your UPI payment</p>
              {store?.upiId && (
                <div className="mt-1.5 mb-3">
                  <p className="text-xs text-amber-700">Pay to UPI ID:</p>
                  <p className="font-mono font-bold text-amber-900 text-base">{store.upiId}</p>
                  {store?.upiName && <p className="text-xs text-amber-700">{store.upiName}</p>}
                  <p className="text-sm font-bold text-amber-900 mt-1">Amount: {currencySymbol}{order.totalAmount.toFixed(2)}</p>
                </div>
              )}
              <label className="block text-xs font-medium text-amber-800 mb-1">Enter UTR / Transaction ID</label>
              <div className="flex gap-2">
                <input
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  placeholder="e.g. 418123456789"
                  className="flex-1 px-3 py-1.5 text-sm border border-amber-300 rounded-lg outline-none focus:border-amber-500 bg-white"
                />
                <button onClick={() => submitUtr.mutate()}
                  disabled={utr.length < 8 || submitUtr.isPending}
                  className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-amber-700 transition-colors">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {utrSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          UTR submitted! The store will verify your payment and confirm the order.
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name} × {item.qty}</span>
              <span className="font-medium">{currencySymbol}{item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{currencySymbol}{order.subtotal.toFixed(2)}</span>
          </div>
          {order.taxTotal > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST</span>
              <span>{currencySymbol}{order.taxTotal.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryCharge > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery</span>
              <span>{currencySymbol}{order.deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{currencySymbol}{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Fulfillment & payment info */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-start gap-3">
          {order.fulfillmentType === "delivery" ? (
            <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Store size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {order.fulfillmentType === "delivery" ? "Home Delivery" : "Store Pickup"}
            </p>
            {order.deliveryAddress && (
              <p className="text-xs text-gray-500 mt-0.5">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            Payment: <span className="font-medium capitalize">{order.paymentMethod}</span>
            {" · "}
            <span className={`capitalize ${order.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
              {order.paymentStatus}
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to={`/store/${slug}/account`}
          className="flex-1 text-center py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          View Orders
        </Link>
        <Link to={`/store/${slug}`}
          className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
