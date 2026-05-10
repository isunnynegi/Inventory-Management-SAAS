import { useState } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, MapPin, User, Plus, Star, Trash2,
  X, Check, Home, Briefcase, FileText,
} from "lucide-react";
import { useCustomerStore } from "../../stores/storefrontStore.js";
import { format } from "date-fns";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  ready: "Ready", out_for_delivery: "Out for Delivery",
  delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700", confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700", ready: "bg-emerald-50 text-emerald-700",
  out_for_delivery: "bg-primary-50 text-primary-700",
  delivered: "bg-emerald-50 text-emerald-700", cancelled: "bg-red-50 text-red-700",
};
const PAYMENT_STATUS_COLORS = {
  pending: "text-amber-600", paid: "text-emerald-600",
  failed: "text-red-600", refunded: "text-gray-600",
};

const ADDR_FIELDS = [
  { name: "label",  label: "Label",        placeholder: "Home / Office", col: 1 },
  { name: "name",   label: "Contact name", placeholder: "Rahul Sharma",  col: 1 },
  { name: "phone",  label: "Phone",        placeholder: "9876543210",    col: 1 },
  { name: "street", label: "Address",      placeholder: "123 Main St",   col: 2 },
  { name: "city",   label: "City",         placeholder: "Mumbai",        col: 1 },
  { name: "state",  label: "State",        placeholder: "Maharashtra",   col: 1 },
  { name: "zip",    label: "PIN code",     placeholder: "400001",        col: 1 },
];

function AddressFormModal({ onClose, onSave, loading }) {
  const [form, setForm] = useState({ label: "Home", name: "", phone: "", street: "", city: "", state: "", zip: "", isDefault: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const valid = form.name && form.street && form.city && form.state && form.zip;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add New Address</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {ADDR_FIELDS.map(f => (
              <div key={f.name} className={f.col === 2 ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={form[f.name]}
                  onChange={e => set(f.name, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
                />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => set("isDefault", !form.isDefault)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${form.isDefault ? "bg-primary-600 border-primary-600" : "border-gray-300"}`}
            >
              {form.isDefault && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm text-gray-700">Set as primary address</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => valid && onSave(form)} disabled={!valid || loading}
            className="flex-1 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerAccountPage() {
  const { store, slug, api } = useOutletContext();
  const { customer, isAuthenticated, updateCustomer } = useCustomerStore();
  const qc = useQueryClient();
  const currencySymbol = store?.currencySymbol || "₹";
  const [tab, setTab] = useState("orders");
  const [addAddrOpen, setAddAddrOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(null);

  const openOrderReceipt = async (orderId) => {
    setInvoiceLoading(orderId);
    try {
      const res = await api.getOrderInvoicePdf(orderId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error("Could not load receipt");
    } finally {
      setInvoiceLoading(null);
    }
  };

  if (!isAuthenticated) return <Navigate to={`/store/${slug}/login?next=/store/${slug}/account`} replace />;

  // ── Orders query — keyed on customer id so it refetches after session restore ──
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["sf-my-orders", slug, customer?._id],
    queryFn: () => api.listOrders({ limit: 50 }),
    enabled: !!customer?._id,
  });
  const orders = ordersData?.data ?? [];

  // ── Address mutations ─────────────────────────────────────────────────────────
  const addAddrMut = useMutation({
    mutationFn: (d) => api.addAddress(d),
    onSuccess: (res) => {
      updateCustomer({ addresses: res.data });
      toast.success("Address added");
      setAddAddrOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to add address"),
  });

  const setPrimaryMut = useMutation({
    mutationFn: (id) => api.setDefaultAddress(id),
    onSuccess: (res) => {
      updateCustomer({ addresses: res.data });
      toast.success("Primary address updated");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to update"),
  });

  const removeAddrMut = useMutation({
    mutationFn: (id) => api.removeAddress(id),
    onSuccess: (res) => {
      updateCustomer({ addresses: res.data });
      toast.success("Address removed");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to remove"),
  });

  const addresses = customer?.addresses || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
            {customer?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{customer?.name}</p>
            <p className="text-sm text-gray-500">{customer?.email}</p>
            {customer?.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { key: "orders",    label: "My Orders",  Icon: Package },
          { key: "addresses", label: "Addresses",  Icon: MapPin  },
        ].map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Orders tab ──────────────────────────────────────────────────────── */}
      {tab === "orders" && (
        <div>
          {ordersLoading ? (
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
                      <p className="font-semibold text-gray-900 text-sm font-mono">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-sm text-gray-600">
                    {order.items.slice(0, 3).map((item, i) => (
                      <p key={i}>{item.name} × {item.qty}</p>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-gray-400 text-xs">+{order.items.length - 3} more items</p>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openOrderReceipt(order._id)}
                        disabled={invoiceLoading === order._id}
                        title="View Receipt"
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {invoiceLoading === order._id
                          ? <span className="w-3 h-3 border-2 border-primary-400/30 border-t-primary-600 rounded-full animate-spin" />
                          : <FileText size={12} />}
                        Receipt
                      </button>
                      <p className="font-bold text-gray-900 text-sm">
                        {currencySymbol}{order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Addresses tab ───────────────────────────────────────────────────── */}
      {tab === "addresses" && (
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
              <MapPin size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-gray-400 text-sm">No saved addresses</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr._id}
                className={`bg-white rounded-xl border-2 p-4 transition-colors ${addr.isDefault ? "border-primary-400" : "border-gray-100"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${addr.isDefault ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-500"}`}>
                      {addr.label?.toLowerCase().includes("office") ? <Briefcase size={15} /> : <Home size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{addr.label || "Home"}</p>
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                            <Star size={10} fill="currentColor" /> Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{addr.name}</p>
                      {addr.phone && <p className="text-xs text-gray-500">{addr.phone}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {addr.street}, {addr.city}, {addr.state} — {addr.zip}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => setPrimaryMut.mutate(addr._id)}
                        disabled={setPrimaryMut.isPending}
                        title="Set as primary"
                        className="p-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium whitespace-nowrap"
                      >
                        <Star size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => removeAddrMut.mutate(addr._id)}
                      disabled={removeAddrMut.isPending}
                      title="Remove"
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          <button
            onClick={() => setAddAddrOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <Plus size={16} /> Add New Address
          </button>
        </div>
      )}

      {/* Add Address Modal */}
      {addAddrOpen && (
        <AddressFormModal
          onClose={() => setAddAddrOpen(false)}
          onSave={(d) => addAddrMut.mutate(d)}
          loading={addAddrMut.isPending}
        />
      )}
    </div>
  );
}
