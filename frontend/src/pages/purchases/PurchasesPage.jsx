import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { purchaseApi, supplierApi, productApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Modal, Badge, Input, Select, Textarea, SearchableSelect } from "../../components/ui/index.jsx";
import { Plus, Eye, Trash2, Search, PlusCircle, MinusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../../stores/authStore.js";

const payBadge = { paid: "green", partial: "yellow", unpaid: "red" };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const { organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [search, setSearch] = useState("");

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: { items: [{ productId: "", qty: 1, costPrice: 0, taxPercent: 0 }], discount: 0, amountPaid: 0, paymentMethod: "cash" }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchDiscount = watch("discount") || 0;

  const { data: supplierData } = useQuery({ queryKey: ["suppliers-all"], queryFn: () => supplierApi.list({ limit: 100 }) });
  const { data: productData } = useQuery({ queryKey: ["products-all"], queryFn: () => productApi.list({ limit: 200 }) });
  const suppliers = supplierData?.data || [];
  const products = productData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", page, search],
    queryFn: () => purchaseApi.list({ page, limit: 20, search }),
  });

  const subtotal = watchItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.costPrice) || 0), 0);
  const taxTotal = watchItems.reduce((s, i) => {
    const base = (Number(i.qty) || 0) * (Number(i.costPrice) || 0);
    return s + base * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const total = subtotal + taxTotal - Number(watchDiscount);

  const createMutation = useMutation({
    mutationFn: (d) => {
      const items = d.items.map(i => {
        const product = products.find(p => p.id === i.productId);
        const lineBase = Number(i.qty) * Number(i.costPrice);
        const taxAmt = lineBase * (Number(i.taxPercent) / 100);
        return { ...i, qty: Number(i.qty), costPrice: Number(i.costPrice), taxPercent: Number(i.taxPercent), taxAmount: taxAmt, lineTotal: lineBase + taxAmt, supplierName: product?.name };
      });
      const supplierObj = suppliers.find(s => s.id === d.supplierId);
      return purchaseApi.create({ ...d, items, subtotal, taxTotal, discount: Number(d.discount), totalAmount: total, amountPaid: Number(d.amountPaid), supplierName: supplierObj?.name });
    },
    onSuccess: () => { qc.invalidateQueries(["purchases"]); qc.invalidateQueries(["products"]); toast.success("Purchase recorded!"); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "PO Number", render: r => <span className="font-mono font-medium text-gray-900">{r.purchaseNumber}</span> },
    { header: "Supplier", render: r => r.supplierName || "—" },
    { header: "Date", render: r => format(new Date(r.date), "dd MMM yyyy") },
    { header: "Items", render: r => `${r.items?.length || 0} items` },
    { header: "Total", render: r => <span className="font-semibold">{sym}{r.totalAmount?.toFixed(2)}</span> },
    { header: "Payment", render: r => <Badge color={payBadge[r.paymentStatus]}>{r.paymentStatus}</Badge> },
    { header: "", cellClassName: "text-right", render: r => (
      <Button variant="ghost" size="sm" onClick={() => setViewModal(r)}><Eye size={13} /></Button>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Purchases</h1><p className="text-sm text-gray-500 dark:text-gray-400">Stock-in records</p></div>
        <Button onClick={() => { reset({ items: [{ productId: "", qty: 1, costPrice: 0, taxPercent: 0 }], discount: 0, amountPaid: 0, paymentMethod: "cash" }); setModal(true); }}><Plus size={16} /> New Purchase</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-50 dark:border-gray-700">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100" placeholder="Search PO number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No purchases yet" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Controller control={control} name="supplierId" render={({ field }) => (
              <SearchableSelect
                label="Supplier"
                placeholder="— Select Supplier —"
                options={[{ value: "", label: "No supplier" }, ...suppliers.map(s => ({ value: s._id || s.id, label: s.name }))]}
                value={field.value}
                onChange={field.onChange}
              />
            )} />
            <Input label="Date" type="date" defaultValue={new Date().toISOString().split("T")[0]} {...register("date")} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Items *</p>
              <button type="button" onClick={() => append({ productId: "", qty: 1, costPrice: 0, taxPercent: 0 })} className="text-primary-600 text-xs flex items-center gap-1 hover:underline"><PlusCircle size={13} /> Add item</button>
            </div>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 items-end">
                    <Controller control={control} name={`items.${i}.productId`} rules={{ required: "Required" }}
                      render={({ field }) => (
                        <SearchableSelect
                          className="flex-1"
                          label="Product *"
                          placeholder="— Select product —"
                          error={errors.items?.[i]?.productId?.message}
                          options={products.map(p => ({ value: p._id || p.id, label: `${p.name} (${p.unit})` }))}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 flex-shrink-0 mb-0.5"><MinusCircle size={18} /></button>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input label="Qty" type="number" step="0.01" {...register(`items.${i}.qty`, { valueAsNumber: true })} />
                    <Input label="Cost Price" type="number" step="0.01" {...register(`items.${i}.costPrice`, { valueAsNumber: true })} />
                    <Input label="Tax %" type="number" step="0.01" {...register(`items.${i}.taxPercent`, { valueAsNumber: true })} />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Line Total</span>
                      <div className="flex items-center h-9 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {sym}{((Number(watchItems[i]?.qty)||0)*(Number(watchItems[i]?.costPrice)||0)*(1+(Number(watchItems[i]?.taxPercent)||0)/100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Discount" type="number" step="0.01" {...register("discount", { valueAsNumber: true })} />
            <Input label="Amount Paid" type="number" step="0.01" {...register("amountPaid", { valueAsNumber: true })} />
            <Controller control={control} name="paymentMethod" render={({ field }) => (
              <SearchableSelect
                label="Payment Method"
                options={["cash","bank","upi","credit","other"].map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )} />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{sym}{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span>{sym}{taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span>-{sym}{Number(watchDiscount).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200"><span>Total:</span><span>{sym}{total.toFixed(2)}</span></div>
          </div>

          <Input label="Notes" {...register("notes")} placeholder="Optional notes..." />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Record Purchase</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Purchase: ${viewModal.purchaseNumber}`} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{viewModal.supplierName || "—"}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{format(new Date(viewModal.date), "dd MMM yyyy")}</span></div>
              <div><span className="text-gray-500">Payment:</span> <Badge color={payBadge[viewModal.paymentStatus]}>{viewModal.paymentStatus}</Badge></div>
              <div><span className="text-gray-500">Method:</span> <span className="capitalize">{viewModal.paymentMethod}</span></div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Total</th></tr></thead>
              <tbody>{viewModal.items?.map((it, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-700 text-center"><td className="px-3 py-2 text-left">{it.productName}</td><td>{it.qty} {it.unit}</td><td>{sym}{it.costPrice}</td><td className="font-medium">{sym}{it.lineTotal?.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
            </div>
            <div className="text-right space-y-1">
              <div>Subtotal: {sym}{viewModal.subtotal?.toFixed(2)}</div>
              {viewModal.taxTotal > 0 && <div>Tax: {sym}{viewModal.taxTotal?.toFixed(2)}</div>}
              {viewModal.discount > 0 && <div>Discount: -{sym}{viewModal.discount?.toFixed(2)}</div>}
              <div className="font-bold text-base">Total: {sym}{viewModal.totalAmount?.toFixed(2)}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
