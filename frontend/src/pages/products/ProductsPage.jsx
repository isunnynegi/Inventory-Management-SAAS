import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { productApi, categoryApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Input, Modal, ConfirmModal, Badge, Select } from "../../components/ui/index.jsx";
import { Plus, Pencil, Trash2, Search, AlertTriangle, PlusCircle, MinusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";

export default function ProductsPage() {
  const qc = useQueryClient();
  const { isAdmin, organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();
  const { fields: attrs, append: appendAttr, remove: removeAttr } = useFieldArray({ control, name: "attributes" });

  const { data: catData } = useQuery({ queryKey: ["categories-all"], queryFn: () => categoryApi.list({ limit: 100 }) });
  const categories = catData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, lowStock],
    queryFn: () => productApi.list({ page, limit: 20, search, lowStock }),
  });

  const mutation = useMutation({
    mutationFn: (d) => modal?.data?.id ? productApi.update(modal.data.id, d) : productApi.create(d),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Saved!"); setModal(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Deleted"); setConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const openEdit = (row) => {
    reset({ name: row.name, sku: row.sku, barcode: row.barcode, categoryId: row.categoryId?.id || row.categoryId, description: row.description, unit: row.unit, stock: row.stock, reorderLevel: row.reorderLevel, purchasePrice: row.purchasePrice, sellingPrice: row.sellingPrice, taxPercent: row.taxPercent, attributes: row.attributes || [] });
    setModal({ mode: "edit", data: row });
  };

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Product", render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        {r.sku && <p className="text-xs text-gray-400">SKU: {r.sku}</p>}
      </div>
    )},
    { header: "Category", render: r => r.categoryId?.name || "—" },
    { header: "Stock", render: r => (
      <div className="flex items-center gap-1.5">
        {r.stock <= r.reorderLevel && <AlertTriangle size={13} className="text-orange-500" />}
        <span className={r.stock <= r.reorderLevel ? "text-orange-600 font-semibold" : ""}>{r.stock} {r.unit}</span>
      </div>
    )},
    { header: "Buy Price", render: r => `${sym}${r.purchasePrice}` },
    { header: "Sell Price", render: r => `${sym}${r.sellingPrice}` },
    { header: "Status", render: r => <Badge color={r.isActive ? "green" : "red"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { header: "", cellClassName: "text-right", render: r => isAdmin() ? (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil size={13} /></Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button>
      </div>
    ) : null },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Products</h1><p className="text-sm text-gray-500">Manage your product catalog</p></div>
        {isAdmin() && <Button onClick={() => { reset({ unit: "pcs", reorderLevel: 10, taxPercent: 0, attributes: [] }); setModal({ mode: "add" }); }}><Plus size={16} /> Add Product</Button>}
      </div>
      <Card>
        <div className="p-4 border-b border-gray-50 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500" placeholder="Search name, SKU, barcode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} className="rounded" />
            Low stock only
          </label>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No products found" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "add" ? "Add Product" : "Edit Product"} size="lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input label="Product Name *" error={errors.name?.message} {...register("name", { required: "Required" })} /></div>
            <Input label="SKU" {...register("sku")} />
            <Input label="Barcode" {...register("barcode")} />
            <Select label="Category" {...register("categoryId")}>
              <option value="">— No Category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Unit" placeholder="pcs, kg, m..." {...register("unit")} />
            <Input label="Purchase Price *" type="number" step="0.01" error={errors.purchasePrice?.message} {...register("purchasePrice", { required: "Required", valueAsNumber: true })} />
            <Input label="Selling Price *" type="number" step="0.01" error={errors.sellingPrice?.message} {...register("sellingPrice", { required: "Required", valueAsNumber: true })} />
            <Input label="Current Stock" type="number" step="0.01" {...register("stock", { valueAsNumber: true })} />
            <Input label="Reorder Level" type="number" {...register("reorderLevel", { valueAsNumber: true })} />
            <Input label="Tax %" type="number" step="0.01" {...register("taxPercent", { valueAsNumber: true })} />
          </div>

          {/* Custom Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Custom Attributes</label>
              <button type="button" onClick={() => appendAttr({ key: "", value: "" })} className="text-primary-600 text-xs flex items-center gap-1 hover:underline">
                <PlusCircle size={13} /> Add attribute
              </button>
            </div>
            {attrs.map((f, i) => (
              <div key={f.id} className="flex gap-2 mb-2">
                <input className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Key (e.g. Color)" {...register(`attributes.${i}.key`)} />
                <input className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Value (e.g. Red)" {...register(`attributes.${i}.value`)} />
                <button type="button" onClick={() => removeAttr(i)} className="text-red-400 hover:text-red-600"><MinusCircle size={18} /></button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => deleteMutation.mutate(confirm?.id)} loading={deleteMutation.isPending} message={`Delete "${confirm?.name}"?`} />
    </div>
  );
}
