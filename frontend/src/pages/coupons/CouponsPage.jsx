import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couponApi } from "../../api/index.js";
import { Tag, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = { code: "", type: "percent", value: "", minOrderAmount: "", maxUses: "", expiresAt: "", isActive: true };

function CouponForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || !form.value) { toast.error("Code and value are required"); return; }
    onSave({
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      maxUses: form.maxUses ? Number(form.maxUses) : 0,
      expiresAt: form.expiresAt || undefined,
      isActive: form.isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Coupon Code *</label>
          <input type="text" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
            placeholder="SAVE20" maxLength={30}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition uppercase" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type *</label>
          <select value={form.type} onChange={e => set("type", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 bg-white transition">
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Value * {form.type === "percent" ? "(%)" : "(₹)"}
          </label>
          <input type="number" min="0" value={form.value} onChange={e => set("value", e.target.value)}
            placeholder={form.type === "percent" ? "20" : "50"}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Order Amount (₹)</label>
          <input type="number" min="0" value={form.minOrderAmount} onChange={e => set("minOrderAmount", e.target.value)}
            placeholder="0 = no minimum"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Uses</label>
          <input type="number" min="0" value={form.maxUses} onChange={e => set("maxUses", e.target.value)}
            placeholder="0 = unlimited"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expires At</label>
          <input type="date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ""} onChange={e => set("expiresAt", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
        </div>
      </div>
      {initial && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative" onClick={() => set("isActive", !form.isActive)}>
            <div className={`w-9 h-5 rounded-full transition-colors ${form.isActive ? "bg-primary-600" : "bg-gray-200"}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-4" : ""}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{form.isActive ? "Active" : "Inactive"}</span>
        </label>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center gap-1.5">
          {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Save Coupon
        </button>
      </div>
    </form>
  );
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ["coupons"], queryFn: couponApi.list });
  const coupons = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: couponApi.create,
    onSuccess: () => { toast.success("Coupon created"); qc.invalidateQueries(["coupons"]); setShowCreate(false); },
    onError: e => toast.error(e.response?.data?.message || "Failed to create coupon"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => couponApi.update(id, data),
    onSuccess: () => { toast.success("Coupon updated"); qc.invalidateQueries(["coupons"]); setEditId(null); },
    onError: e => toast.error(e.response?.data?.message || "Failed to update coupon"),
  });

  const deleteMut = useMutation({
    mutationFn: couponApi.delete,
    onSuccess: () => { toast.success("Coupon deleted"); qc.invalidateQueries(["coupons"]); setDeleteId(null); },
    onError: e => toast.error(e.response?.data?.message || "Failed to delete coupon"),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Coupons</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Discount codes for your online store</p>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            <Plus size={15} /> New Coupon
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Tag size={16} /> New Coupon
          </h3>
          <CouponForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMut.isPending} />
        </div>
      )}

      {/* Coupons list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Tag size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No coupons yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create discount codes to attract customers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => (
            <div key={c._id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
              {editId === c._id ? (
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Coupon</h3>
                  <CouponForm
                    initial={{
                      ...c,
                      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
                    }}
                    onSave={d => updateMut.mutate({ id: c._id, data: d })}
                    onCancel={() => setEditId(null)}
                    loading={updateMut.isPending}
                  />
                </div>
              ) : deleteId === c._id ? (
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Delete <span className="font-semibold">{c.code}</span>? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteId(null)}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => deleteMut.mutate(c._id)} disabled={deleteMut.isPending}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm tracking-wider">{c.code}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-primary-600">
                        {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                      </span>
                      {c.minOrderAmount > 0 && <span>Min order: ₹{c.minOrderAmount}</span>}
                      {c.maxUses > 0 && <span>Uses: {c.usedCount}/{c.maxUses}</span>}
                      {c.maxUses === 0 && <span>Uses: {c.usedCount} (unlimited)</span>}
                      {c.expiresAt && <span>Expires: {new Date(c.expiresAt).toLocaleDateString("en-IN")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditId(c._id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(c._id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
