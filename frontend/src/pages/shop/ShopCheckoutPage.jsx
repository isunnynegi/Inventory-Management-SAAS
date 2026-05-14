import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Store, Banknote, CreditCard, Smartphone, Check, ArrowLeft, AlertCircle } from "lucide-react";
import { storeApi } from "../../api/storefront.js";
import { useShopCartStore, useShopCustomerStore } from "../../stores/shopStore.js";
import { shopApi } from "../../api/shopApi.js";
import toast from "react-hot-toast";

const METHOD_LABELS = { cash: "Cash on Delivery", upi: "UPI", card: "Card / Net Banking" };
const METHOD_ICONS = { cash: Banknote, upi: Smartphone, card: CreditCard };

function AddressForm({ value, onChange }) {
  const f = (k) => (v) => onChange(prev => ({ ...prev, [k]: v }));
  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value[key] || ""}
        onChange={e => onChange(prev => ({ ...prev, [key]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">{field("Full name", "name", "text", "Recipient name")}</div>
      <div className="col-span-2">{field("Phone", "phone", "tel", "+91 9999999999")}</div>
      <div className="col-span-2">{field("Street address", "street", "text", "House / flat / street")}</div>
      {field("City", "city")} {field("State", "state")}
      {field("PIN code", "zip", "text", "400001")} {field("Country", "country", "text", "India")}
    </div>
  );
}

export default function ShopCheckoutPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const api = storeApi(slug);

  const { itemsByStore, clearStore } = useShopCartStore();
  const { customer, isAuthenticated } = useShopCustomerStore();

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) nav(`/shop/login?next=/shop/store/${slug}/checkout`, { replace: true });
  }, [isAuthenticated]);

  // Get this store's items from cart
  const storeMap = itemsByStore();
  const items = storeMap.get(slug) || [];

  const { data: storeData } = useQuery({ queryKey: ["shop-store-info", slug], queryFn: api.getInfo });
  const store = storeData?.data;

  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [savedAddrIdx, setSavedAddrIdx] = useState(null);
  const [address, setAddress] = useState({});
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const customerInitRef = useRef(false);

  useEffect(() => {
    if (!store) return;
    if (store.deliveryEnabled) setFulfillmentType("delivery");
    if (store.paymentMethods?.length) setPaymentMethod(store.paymentMethods[0]);
  }, [store]);

  useEffect(() => {
    if (customer?.addresses?.length && !customerInitRef.current) {
      customerInitRef.current = true;
      const i = customer.addresses.findIndex(a => a.isDefault);
      const idx = i >= 0 ? i : 0;
      setSavedAddrIdx(idx);
      setAddress(customer.addresses[idx]);
    }
  }, [customer]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 mb-4">No items from this store in your cart</p>
        <Link to="/shop/cart" className="text-sm text-primary-600 hover:underline">Back to cart</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const taxTotal = items.reduce((s, i) => s + (i.unitPrice * i.qty * (i.taxPercent || 0)) / 100, 0);
  const currencySymbol = items[0]?.currencySymbol || "₹";
  const freeAbove = store?.freeDeliveryAbove || 0;
  const deliveryCharge = fulfillmentType === "delivery"
    ? (freeAbove > 0 && subtotal >= freeAbove ? 0 : store?.deliveryCharge || 0)
    : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? Math.min((subtotal * appliedCoupon.value) / 100, appliedCoupon.maxDiscount || Infinity)
      : appliedCoupon.value
    : 0;
  const total = subtotal + taxTotal + deliveryCharge - couponDiscount;

  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.validateCoupon(couponInput.trim(), subtotal);
      setAppliedCoupon(res.data);
      toast.success("Coupon applied!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally { setCouponLoading(false); }
  };

  const { mutate: placeOrder, isLoading: placing } = useMutation({
    mutationFn: () => api.createOrder({
      items: items.map(i => ({ productId: i.productId, qty: i.qty })),
      fulfillmentType,
      deliveryAddress: fulfillmentType === "delivery" ? address : undefined,
      paymentMethod,
      notes: notes || undefined,
      couponCode: appliedCoupon?.code || undefined,
    }),
    onSuccess: (res) => {
      clearStore(slug);
      const orderId = res.data._id;
      if (paymentMethod === "card" && store?.juspayEnabled) {
        api.initiateJuspay({ orderId }).then(r => { window.location.href = r.data.paymentLink; });
      } else {
        nav(`/shop/store/${slug}/order/${orderId}`);
      }
    },
    onError: err => toast.error(err.response?.data?.message || "Failed to place order"),
  });

  const canPlace = fulfillmentType === "pickup" ||
    (address.name && address.street && address.city && address.state && address.zip);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/shop/cart" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={14} /> Back to cart
      </Link>

      <h1 className="text-lg font-bold text-gray-900 mb-1">Checkout — {items[0]?.storeName || slug}</h1>
      <p className="text-sm text-gray-500 mb-6">{items.length} item{items.length !== 1 ? "s" : ""} · {currencySymbol}{subtotal.toLocaleString("en-IN")}</p>

      <div className="space-y-4">
        {/* Fulfillment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Fulfillment</h2>
          <div className="flex gap-3">
            {store?.deliveryEnabled && (
              <button onClick={() => setFulfillmentType("delivery")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${fulfillmentType === "delivery" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                <MapPin size={18} className={fulfillmentType === "delivery" ? "text-primary-600" : "text-gray-400"} />
                <div className="text-left">
                  <p className="text-sm font-medium">Home Delivery</p>
                  <p className="text-xs text-gray-400">
                    {deliveryCharge === 0 && fulfillmentType === "delivery"
                      ? "Free delivery" : `+${currencySymbol}${store?.deliveryCharge || 0}`}
                  </p>
                </div>
                {fulfillmentType === "delivery" && <Check size={16} className="ml-auto text-primary-600" />}
              </button>
            )}
            {store?.pickupEnabled !== false && (
              <button onClick={() => setFulfillmentType("pickup")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${fulfillmentType === "pickup" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                <Store size={18} className={fulfillmentType === "pickup" ? "text-primary-600" : "text-gray-400"} />
                <div className="text-left">
                  <p className="text-sm font-medium">Store Pickup</p>
                  <p className="text-xs text-gray-400">Free</p>
                </div>
                {fulfillmentType === "pickup" && <Check size={16} className="ml-auto text-primary-600" />}
              </button>
            )}
          </div>
        </div>

        {/* Delivery address */}
        {fulfillmentType === "delivery" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Delivery address</h2>
            {customer?.addresses?.length > 0 && (
              <div className="space-y-2 mb-3">
                {customer.addresses.map((a, idx) => (
                  <label key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 transition">
                    <input type="radio" name="addr" checked={savedAddrIdx === idx}
                      onChange={() => { setSavedAddrIdx(idx); setAddress(a); }}
                      className="mt-0.5 accent-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.label || "Address"} — {a.name}</p>
                      <p className="text-xs text-gray-400">{a.street}, {a.city} {a.zip}</p>
                    </div>
                  </label>
                ))}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 transition">
                  <input type="radio" name="addr" checked={savedAddrIdx === null}
                    onChange={() => { setSavedAddrIdx(null); setAddress({}); }}
                    className="accent-primary-600" />
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Payment method</h2>
          <div className="space-y-2">
            {(store?.paymentMethods || ["cash"]).map(method => {
              const Icon = METHOD_ICONS[method] || Banknote;
              return (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${paymentMethod === method ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <Icon size={18} className={paymentMethod === method ? "text-primary-600" : "text-gray-400"} />
                  <span className="text-sm font-medium">{METHOD_LABELS[method] || method}</span>
                  {paymentMethod === method && <Check size={16} className="ml-auto text-primary-600" />}
                </button>
              );
            })}
          </div>
          {paymentMethod === "upi" && store?.upiId && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500 text-xs mb-1">Pay to</p>
              <p className="font-mono font-semibold text-gray-900">{store.upiId}</p>
              {store.upiName && <p className="text-xs text-gray-400">{store.upiName}</p>}
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Coupon code</h2>
          <div className="flex gap-2">
            <input type="text" placeholder="Enter code" value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setAppliedCoupon(null); }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400 uppercase" />
            <button onClick={validateCoupon} disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
          {appliedCoupon && (
            <p className="mt-2 text-xs text-emerald-600 font-medium">
              ✓ {appliedCoupon.code} — {currencySymbol}{couponDiscount.toFixed(2)} off
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Order notes <span className="text-gray-400 font-normal">(optional)</span></h2>
          <textarea rows={2} placeholder="Any instructions for the store…" value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400 resize-none" />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{currencySymbol}{subtotal.toLocaleString("en-IN")}</span></div>
            {taxTotal > 0 && <div className="flex justify-between text-gray-400 text-xs"><span>GST</span><span>+{currencySymbol}{taxTotal.toFixed(2)}</span></div>}
            {deliveryCharge > 0 && <div className="flex justify-between text-gray-400 text-xs"><span>Delivery</span><span>+{currencySymbol}{deliveryCharge}</span></div>}
            {couponDiscount > 0 && <div className="flex justify-between text-emerald-600 text-xs"><span>Coupon ({appliedCoupon?.code})</span><span>-{currencySymbol}{couponDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span><span>{currencySymbol}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button onClick={() => placeOrder()} disabled={placing || !canPlace}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {placing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Place Order · {currencySymbol}{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
