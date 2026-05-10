import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Store, CreditCard, Smartphone, Banknote, ArrowLeft, Check, Tag, X, Loader2 } from "lucide-react";
import { useCartStore, useCustomerStore } from "../../stores/storefrontStore.js";
import toast from "react-hot-toast";

const PAYMENT_LABELS = { cash: "Cash on Delivery", upi: "UPI", card: "Card / Netbanking" };
const PAYMENT_ICONS = { cash: Banknote, upi: Smartphone, card: CreditCard };

function AddressForm({ value, onChange }) {
  const fields = [
    { name: "name", label: "Full name", type: "text", placeholder: "Rahul Sharma" },
    { name: "phone", label: "Phone", type: "tel", placeholder: "9876543210" },
    { name: "street", label: "Address line", type: "text", placeholder: "123 Main St, Sector 5" },
    { name: "city", label: "City", type: "text", placeholder: "Mumbai" },
    { name: "state", label: "State", type: "text", placeholder: "Maharashtra" },
    { name: "zip", label: "PIN code", type: "text", placeholder: "400001" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(f => (
        <div key={f.name} className={f.name === "street" ? "col-span-2" : ""}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
          <input
            type={f.type}
            placeholder={f.placeholder}
            value={value[f.name] || ""}
            onChange={e => onChange({ ...value, [f.name]: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
          />
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const { store, slug, api } = useOutletContext();
  const nav = useNavigate();
  const { items, clearCart } = useCartStore();
  const { customer } = useCustomerStore();
  const currencySymbol = store?.currencySymbol || "₹";

  // Initialize from store/customer data — both load asynchronously after mount
  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [savedAddrIdx, setSavedAddrIdx] = useState(null);
  const [address, setAddress] = useState({});
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const storeInitRef = useRef(false);
  const customerInitRef = useRef(false);

  // Set fulfillment + payment once store data arrives
  useEffect(() => {
    if (store && !storeInitRef.current) {
      storeInitRef.current = true;
      setFulfillmentType(store.deliveryEnabled ? "delivery" : "pickup");
      if (store.paymentMethods?.length) setPaymentMethod(store.paymentMethods[0]);
    }
  }, [store?.slug]);

  // Pre-select primary address once customer data arrives
  useEffect(() => {
    if (customer?.addresses?.length && !customerInitRef.current) {
      customerInitRef.current = true;
      const i = customer.addresses.findIndex(a => a.isDefault);
      const idx = i >= 0 ? i : 0;
      setSavedAddrIdx(idx);
      setAddress(customer.addresses[idx]);
    }
  }, [customer?._id]);

  if (!items || items.length === 0) {
    nav(`/store/${slug}/cart`);
    return null;
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const taxTotal = items.reduce((s, i) => s + (i.unitPrice * i.qty * (i.taxPercent / 100)), 0);
  const deliveryCharge = fulfillmentType === "delivery"
    ? (store?.freeDeliveryAbove > 0 && subtotal >= store.freeDeliveryAbove ? 0 : (store?.deliveryCharge || 0))
    : 0;
  const couponDiscount = appliedCoupon?.discount || 0;
  const total = subtotal + taxTotal + deliveryCharge - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.validateCoupon(couponInput.trim(), subtotal);
      setAppliedCoupon(res.data);
      toast.success(`Coupon applied! You save ${currencySymbol}${res.data.discount.toFixed(2)}`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid coupon code");
    } finally {
      setCouponLoading(false);
    }
  };

  const placeOrder = useMutation({
    mutationFn: () => api.createOrder({
      items: items.map(i => ({ productId: i.productId, qty: i.qty })),
      fulfillmentType,
      deliveryAddress: fulfillmentType === "delivery" ? address : undefined,
      paymentMethod,
      notes: notes || undefined,
      couponCode: appliedCoupon?.code || undefined,
    }),
    onSuccess: async ({ data: order }) => {
      clearCart();
      api.syncCart([]).catch(() => {});
      if (paymentMethod === "card" && store?.juspayEnabled) {
        // Initiate Juspay
        try {
          const res = await api.initiateJuspay({ orderId: order._id });
          window.location.href = res.data.paymentLink;
        } catch {
          nav(`/store/${slug}/order/${order._id}`);
        }
      } else {
        nav(`/store/${slug}/order/${order._id}`);
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to place order"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(`/store/${slug}/cart`)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Fulfillment */}
      {(store?.deliveryEnabled || store?.pickupEnabled) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Fulfillment</h3>
          <div className="flex gap-3">
            {store?.deliveryEnabled && (
              <button
                onClick={() => setFulfillmentType("delivery")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${fulfillmentType === "delivery" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <MapPin size={18} className={fulfillmentType === "delivery" ? "text-primary-600" : "text-gray-400"} />
                <div className="text-left">
                  <p className="text-sm font-medium">Home Delivery</p>
                  <p className="text-xs text-gray-500">
                    {deliveryCharge === 0 && fulfillmentType === "delivery" && store?.freeDeliveryAbove > 0 && subtotal >= store.freeDeliveryAbove
                      ? "Free delivery"
                      : store?.deliveryCharge > 0 ? `${currencySymbol}${store.deliveryCharge} charge` : "Free delivery"}
                  </p>
                </div>
              </button>
            )}
            {store?.pickupEnabled && (
              <button
                onClick={() => setFulfillmentType("pickup")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${fulfillmentType === "pickup" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <Store size={18} className={fulfillmentType === "pickup" ? "text-primary-600" : "text-gray-400"} />
                <div className="text-left">
                  <p className="text-sm font-medium">Store Pickup</p>
                  <p className="text-xs text-gray-500">Pick up at store</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delivery address */}
      {fulfillmentType === "delivery" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>

          {customer?.addresses?.length > 0 && (
            <div className="mb-3 space-y-2">
              {customer.addresses.map((a, idx) => (
                <label key={idx} onClick={() => { setSavedAddrIdx(idx); setAddress(a); }}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${savedAddrIdx === idx ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${savedAddrIdx === idx ? "border-primary-600" : "border-gray-300"}`}>
                    {savedAddrIdx === idx && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.label || "Home"} — {a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.street}, {a.city}, {a.state} {a.zip}</p>
                    {a.phone && <p className="text-xs text-gray-400 mt-0.5">{a.phone}</p>}
                  </div>
                </label>
              ))}
              <label onClick={() => { setSavedAddrIdx(null); setAddress({}); }}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${savedAddrIdx === null ? "border-primary-500 bg-primary-50" : "border-dashed border-gray-200 hover:border-gray-300"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${savedAddrIdx === null ? "border-primary-600" : "border-gray-300"}`}>
                  {savedAddrIdx === null && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                </div>
                <span className="text-sm text-primary-600 font-medium">Use a different address</span>
              </label>
            </div>
          )}

          {(savedAddrIdx === null || !customer?.addresses?.length) && (
            <AddressForm value={address} onChange={setAddress} />
          )}
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
        <div className="space-y-2">
          {(store?.paymentMethods || ["cash"]).map(method => {
            const Icon = PAYMENT_ICONS[method] || CreditCard;
            return (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${paymentMethod === method ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <Icon size={18} className={paymentMethod === method ? "text-primary-600" : "text-gray-400"} />
                <span className="text-sm font-medium">{PAYMENT_LABELS[method] || method}</span>
                {paymentMethod === method && <Check size={16} className="ml-auto text-primary-600" />}
              </button>
            );
          })}
        </div>

        {paymentMethod === "upi" && store?.upiId && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-800">After placing order, pay to:</p>
            <p className="font-mono text-sm font-bold text-amber-900 mt-0.5">{store.upiId}</p>
            {store?.upiName && <p className="text-xs text-amber-700">{store.upiName}</p>}
            <p className="text-xs text-amber-600 mt-1">Enter the UTR/transaction ID on the order confirmation page.</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Order Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any special instructions…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition resize-none"
        />
      </div>

      {/* Coupon */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag size={16} /> Apply Coupon</h3>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{appliedCoupon.code}</p>
              <p className="text-xs text-emerald-600">You save {currencySymbol}{appliedCoupon.discount.toFixed(2)}</p>
            </div>
            <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}
              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={e => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition uppercase"
            />
            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
            </button>
          </div>
        )}
      </div>

      {/* Order total */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        {taxTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST</span>
            <span>{currencySymbol}{taxTotal.toFixed(2)}</span>
          </div>
        )}
        {fulfillmentType === "delivery" && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery charge</span>
            <span>{deliveryCharge === 0 ? "Free" : `${currencySymbol}${deliveryCharge}`}</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 font-medium">
            <span>Coupon discount</span>
            <span>−{currencySymbol}{couponDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
          <span>Total</span>
          <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={() => placeOrder.mutate()}
        disabled={placeOrder.isPending}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 disabled:opacity-60 transition-colors"
      >
        {placeOrder.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Place Order · {currencySymbol}{total.toFixed(2)}
      </button>
    </div>
  );
}
