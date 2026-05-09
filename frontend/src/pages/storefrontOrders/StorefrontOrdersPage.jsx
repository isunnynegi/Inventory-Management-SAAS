import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ShoppingBag, MapPin, Store, Eye, Check, X, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { sfOrderApi } from "../../api/index.js";
import { Card, Badge, Spinner, Modal, Button, SearchableSelect } from "../../components/ui/index.jsx";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS = {
  pending: "yellow",
  confirmed: "blue",
  processing: "blue",
  ready: "green",
  out_for_delivery: "blue",
  delivered: "green",
  cancelled: "red",
};

const PAYMENT_STATUS_COLORS = { pending: "yellow", paid: "green", failed: "red", refunded: "gray" };

function OrderDetailModal({ order, onClose, onUpdateStatus, onConfirmPayment, statusPending, paymentPending }) {
  const [newStatus, setNewStatus] = useState(order?.status || "");
  const [newPayment, setNewPayment] = useState(order?.paymentStatus || "");
  const [note, setNote] = useState("");
  if (!order) return null;

  return (
    <Modal open={!!order} onClose={onClose} title={`Order #${order.orderNumber}`} size="lg">
      <div className="space-y-5">
        {/* Status & payment controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Order Status</label>
            <SearchableSelect
              options={STATUS_OPTIONS.filter(s => s.value)}
              value={newStatus}
              onChange={setNewStatus}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Status</label>
            <SearchableSelect
              options={["pending", "paid", "failed", "refunded"].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
              value={newPayment}
              onChange={setNewPayment}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note to status update…" className="input text-sm" />
        </div>
        <div className="flex gap-2">
          {newStatus !== order.status && (
            <Button size="sm" onClick={() => onUpdateStatus({ status: newStatus, note })} loading={statusPending}>
              Update Status
            </Button>
          )}
          {newPayment !== order.paymentStatus && (
            <Button size="sm" variant="secondary" onClick={() => onConfirmPayment({ paymentStatus: newPayment, note })} loading={paymentPending}>
              Update Payment
            </Button>
          )}
        </div>

        {/* Customer */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Customer</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customerName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{order.customerEmail} · {order.customerPhone}</p>
        </div>

        {/* Fulfillment */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fulfillment</p>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            {order.fulfillmentType === "delivery" ? <MapPin size={14} /> : <Store size={14} />}
            <span className="capitalize">{order.fulfillmentType}</span>
          </div>
          {order.deliveryAddress && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {order.deliveryAddress.name}, {order.deliveryAddress.phone}<br />
              {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
            </p>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.qty}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">₹{item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.taxTotal > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>GST</span><span>₹{order.taxTotal.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery</span><span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base pt-1">
              <span>Total</span><span>₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        {(order.utrNumber || order.juspayPaymentId) && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Payment</p>
            {order.utrNumber && <p className="text-sm text-gray-700 dark:text-gray-300">UTR: <span className="font-mono font-medium">{order.utrNumber}</span></p>}
            {order.juspayPaymentId && <p className="text-sm text-gray-700 dark:text-gray-300">Juspay ID: <span className="font-mono font-medium">{order.juspayPaymentId}</span></p>}
          </div>
        )}

        {order.notes && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function StorefrontOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data: statsData } = useQuery({ queryKey: ["sf-order-stats"], queryFn: sfOrderApi.stats, staleTime: 30000 });
  const stats = statsData?.data;

  const { data, isLoading } = useQuery({
    queryKey: ["sf-orders", { search, status, page }],
    queryFn: () => sfOrderApi.list({ search: search || undefined, status: status || undefined, page, limit: 20 }),
    keepPreviousData: true,
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? {};

  const refresh = () => {
    qc.invalidateQueries(["sf-orders"]);
    qc.invalidateQueries(["sf-order-stats"]);
  };

  const updateStatus = useMutation({
    mutationFn: d => sfOrderApi.updateStatus(selected._id, d),
    onSuccess: ({ data: updated }) => {
      toast.success("Order status updated");
      setSelected(updated);
      refresh();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Update failed"),
  });

  const confirmPayment = useMutation({
    mutationFn: d => sfOrderApi.confirmPayment(selected._id, d),
    onSuccess: ({ data: updated }) => {
      toast.success("Payment status updated");
      setSelected(updated);
      refresh();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Update failed"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Storefront Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Customer orders from your online store.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "gray" },
            { label: "Pending", value: stats.pending, color: "yellow" },
            { label: "Active", value: stats.active, color: "blue" },
            { label: "Delivered", value: stats.delivered, color: "green" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search by order # or customer…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <SearchableSelect
          className="w-44"
          options={STATUS_OPTIONS}
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                  <tr>
                    {["Order", "Customer", "Amount", "Payment", "Fulfillment", "Status", "Date", ""].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {orders.map(o => (
                    <tr key={o._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-gray-700 dark:text-gray-300">{o.orderNumber}</td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{o.customerName}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{o.customerEmail}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">₹{o.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge color={PAYMENT_STATUS_COLORS[o.paymentStatus] || "gray"}>
                          {o.paymentMethod} · {o.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          {o.fulfillmentType === "delivery" ? <MapPin size={12} /> : <Store size={12} />}
                          <span className="capitalize">{o.fulfillmentType}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={STATUS_COLORS[o.status] || "gray"}>
                          {STATUS_OPTIONS.find(s => s.value === o.status)?.label || o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                        {format(new Date(o.createdAt), "dd MMM, hh:mm a")}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => setSelected(o)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">Showing {orders.length} of {meta.totalDocs} orders</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <OrderDetailModal
        order={selected}
        onClose={() => setSelected(null)}
        onUpdateStatus={updateStatus.mutate}
        onConfirmPayment={confirmPayment.mutate}
        statusPending={updateStatus.isPending}
        paymentPending={confirmPayment.isPending}
      />
    </div>
  );
}
