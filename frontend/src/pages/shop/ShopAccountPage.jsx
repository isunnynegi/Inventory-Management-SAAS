import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, Plus, Trash2, Star, User, LogOut, Store, ChevronRight } from "lucide-react";
import { useShopCustomerStore } from "../../stores/shopStore.js";
import { shopApi } from "../../api/shopApi.js";
import toast from "react-hot-toast";

const ORDER_STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  out_for_delivery: "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

function OrdersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["shop-all-orders"],
    queryFn: () => shopApi.listOrders({ limit: 50 }),
  });
  const orders = data?.data ?? [];

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (orders.length === 0) return (
    <div className="text-center py-12">
      <Package size={40} className="mx-auto mb-3 text-gray-200" />
      <p className="text-gray-400 mb-4">No orders yet</p>
      <Link to="/shop" className="text-sm text-primary-600 hover:underline">Start shopping</Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const storeName = order.organizationId?.storeName || order.organizationId?.name || "Store";
        const slug = order.organizationId?.slug;
        return (
          <div key={order._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Store size={11} className="text-gray-400" />
                  {slug ? (
                    <Link to={`/shop/store/${slug}`} className="text-xs text-primary-600 hover:underline">{storeName}</Link>
                  ) : (
                    <span className="text-xs text-gray-400">{storeName}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                {order.status?.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-2">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
            <div className="text-xs text-gray-500 mb-3">
              {order.items?.slice(0, 2).map(i => i.name).join(", ")}
              {order.items?.length > 2 && ` +${order.items.length - 2} more`}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">₹{order.totalAmount?.toLocaleString("en-IN")}</span>
              {slug && (
                <Link to={`/shop/store/${slug}/order/${order._id}`}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                  Details <ChevronRight size={11} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddressForm({ value, onChange }) {
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
      <div className="col-span-2">{field("Label", "label", "text", "Home / Office")}</div>
      <div className="col-span-2">{field("Full name", "name", "text", "Recipient name")}</div>
      <div className="col-span-2">{field("Phone", "phone", "tel", "+91 9999999999")}</div>
      <div className="col-span-2">{field("Street address", "street", "text", "House / flat / street")}</div>
      {field("City", "city")} {field("State", "state")}
      {field("PIN code", "zip", "text", "400001")}
    </div>
  );
}

function AddressesTab() {
  const qc = useQueryClient();
  const { customer, updateCustomer } = useShopCustomerStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});

  const addMutation = useMutation({
    mutationFn: d => shopApi.addAddress(d),
    onSuccess: res => {
      updateCustomer({ addresses: res.data.addresses });
      setAdding(false); setForm({});
      toast.success("Address added");
    },
    onError: () => toast.error("Failed to add address"),
  });

  const removeMutation = useMutation({
    mutationFn: id => shopApi.removeAddress(id),
    onSuccess: res => { updateCustomer({ addresses: res.data.addresses }); toast.success("Address removed"); },
    onError: () => toast.error("Failed to remove"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: id => shopApi.setDefaultAddress(id),
    onSuccess: res => { updateCustomer({ addresses: res.data.addresses }); toast.success("Default address updated"); },
    onError: () => toast.error("Failed"),
  });

  const addresses = customer?.addresses || [];

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !adding && (
        <div className="text-center py-10">
          <MapPin size={36} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400 mb-3">No saved addresses</p>
        </div>
      )}

      {addresses.map(a => (
        <div key={a._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700">{a.label || "Address"}</span>
              {a.isDefault && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
            </div>
            <p className="text-sm text-gray-800">{a.name} · {a.phone}</p>
            <p className="text-xs text-gray-400">{a.street}, {a.city} {a.zip}</p>
          </div>
          <div className="flex items-center gap-1 ml-3">
            {!a.isDefault && (
              <button onClick={() => setDefaultMutation.mutate(a._id)}
                className="p-1.5 text-gray-300 hover:text-amber-500 transition-colors" title="Set as default">
                <Star size={14} />
              </button>
            )}
            <button onClick={() => removeMutation.mutate(a._id)}
              className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-medium text-gray-900 text-sm mb-3">New address</h3>
          <AddressForm value={form} onChange={setForm} />
          <div className="flex gap-2 mt-4">
            <button onClick={() => addMutation.mutate(form)} disabled={addMutation.isLoading}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
              {addMutation.isLoading ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setAdding(false); setForm({}); }}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
          <Plus size={14} /> Add address
        </button>
      )}
    </div>
  );
}

export default function ShopAccountPage() {
  const nav = useNavigate();
  const { customer, isAuthenticated, clearCustomer } = useShopCustomerStore();
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    if (!isAuthenticated) nav("/shop/login?next=/shop/account", { replace: true });
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try { await shopApi.logout(); } catch (_) {}
    clearCustomer();
    toast.success("Signed out");
    nav("/shop");
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <User size={18} className="text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{customer?.name}</p>
            <p className="text-xs text-gray-400">{customer?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-5">
        {[{ id: "orders", label: "My Orders", icon: Package }, { id: "addresses", label: "Addresses", icon: MapPin }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" ? <OrdersTab /> : <AddressesTab />}
    </div>
  );
}
