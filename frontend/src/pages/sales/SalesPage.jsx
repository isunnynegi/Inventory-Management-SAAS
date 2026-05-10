import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { saleApi, customerApi, productApi, invoiceApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Modal, Badge, Input, Select, SearchableSelect } from "../../components/ui/index.jsx";
import { Plus, Eye, FileText, PlusCircle, MinusCircle, Search } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../../stores/authStore.js";

const payBadge = { paid: "green", partial: "yellow", unpaid: "red" };

export default function SalesPage() {
  const qc = useQueryClient();
  const { organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [search, setSearch] = useState("");

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: { items: [{ productId: "", qty: 1, sellingPrice: 0, taxPercent: 0 }], discount: 0, amountPaid: 0, paymentMethod: "cash" }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchDiscount = watch("discount") || 0;

  const { data: custData } = useQuery({ queryKey: ["customers-all"], queryFn: () => customerApi.list({ limit: 100 }) });
  const { data: productData } = useQuery({ queryKey: ["products-all"], queryFn: () => productApi.list({ limit: 200 }) });
  const customers = custData?.data || [];
  const products = productData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["sales", page, search],
    queryFn: () => saleApi.list({ page, limit: 20, search }),
  });

  const subtotal = watchItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.sellingPrice) || 0), 0);
  const taxTotal = watchItems.reduce((s, i) => {
    const base = (Number(i.qty) || 0) * (Number(i.sellingPrice) || 0);
    return s + base * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const total = subtotal + taxTotal - Number(watchDiscount);

  const onProductSelect = (index, pid) => {
    const p = products.find(x => (x._id || x.id) === pid);
    if (p) {
      setValue(`items.${index}.sellingPrice`, p.sellingPrice ?? 0);
      setValue(`items.${index}.taxPercent`, p.taxPercent ?? 0);
    }
  };

  const createMutation = useMutation({
    mutationFn: (d) => {
      const items = d.items.map(i => {
        const lineBase = Number(i.qty) * Number(i.sellingPrice);
        const taxAmt = lineBase * (Number(i.taxPercent) / 100);
        return { ...i, qty: Number(i.qty), sellingPrice: Number(i.sellingPrice), taxPercent: Number(i.taxPercent), taxAmount: taxAmt, lineTotal: lineBase + taxAmt };
      });
      const custObj = customers.find(c => (c._id || c.id) === d.customerId);
      const payload = { ...d, items, subtotal, taxTotal, discount: Number(d.discount), totalAmount: total, amountPaid: Number(d.amountPaid), customerName: custObj?.name };
      if (!payload.customerId) delete payload.customerId;
      return saleApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(["sales"]); qc.invalidateQueries(["products"]); toast.success("Sale recorded!"); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const generateInvoice = async (saleId) => {
    try { await invoiceApi.fromSale(saleId); qc.invalidateQueries(["invoices"]); toast.success("Invoice generated!"); }
    catch (e) { toast.error(e.response?.data?.message || "Error generating invoice"); }
  };

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Sale #", render: r => <span className="font-mono font-medium">{r.saleNumber}</span> },
    { header: "Customer", render: r => r.customerName || "Walk-in" },
    { header: "Date", render: r => format(new Date(r.date), "dd MMM yyyy") },
    { header: "Items", render: r => `${r.items?.length || 0} items` },
    { header: "Total", render: r => <span className="font-semibold">{sym}{r.totalAmount?.toFixed(2)}</span> },
    { header: "Payment", render: r => <Badge color={payBadge[r.paymentStatus]}>{r.paymentStatus}</Badge> },
    { header: "", cellClassName: "text-right", render: r => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => setViewModal(r)}><Eye size={13} /></Button>
        {!r.invoiceId && <Button variant="ghost" size="sm" onClick={() => generateInvoice(r._id || r.id)} title="Generate Invoice"><FileText size={13} /></Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sales</h1><p className="text-sm text-gray-500 dark:text-gray-400">Stock-out records</p></div>
        <Button onClick={() => { reset({ items: [{ productId: "", qty: 1, sellingPrice: 0, taxPercent: 0 }], discount: 0, amountPaid: 0, paymentMethod: "cash" }); setModal(true); }}><Plus size={16} /> New Sale</Button>
      </div>
      <Card>
        <div className="p-4 border-b border-gray-50 dark:border-gray-700">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100" placeholder="Search sale number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No sales yet" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Controller control={control} name="customerId" render={({ field }) => (
              <SearchableSelect
                label="Customer"
                placeholder="— Walk-in Customer —"
                options={[{ value: "", label: "Walk-in Customer" }, ...customers.map(c => ({ value: c._id || c.id, label: `${c.name}${c.phone ? ` (${c.phone})` : ""}` }))]}
                value={field.value}
                onChange={field.onChange}
              />
            )} />
            <Input label="Date" type="date" defaultValue={new Date().toISOString().split("T")[0]} {...register("date")} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Items *</p>
              <button type="button" onClick={() => append({ productId: "", qty: 1, sellingPrice: 0, taxPercent: 0 })} className="text-primary-600 text-xs flex items-center gap-1 hover:underline"><PlusCircle size={13} /> Add item</button>
            </div>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 items-end">
                    <Controller control={control} name={`items.${i}.productId`} rules={{ required: true }}
                      render={({ field }) => (
                        <SearchableSelect
                          className="flex-1"
                          label="Product *"
                          placeholder="— Select product —"
                          options={products.map(p => ({ value: p._id || p.id, label: `${p.name} (Stock: ${p.stock})` }))}
                          value={field.value}
                          onChange={(val) => { field.onChange(val); onProductSelect(i, val); }}
                        />
                      )}
                    />
                    {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 flex-shrink-0 mb-0.5"><MinusCircle size={18} /></button>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Input label="Qty" type="number" step="1" min="1" {...register(`items.${i}.qty`, { valueAsNumber: true, min: 1 })} />
                    <Input label="Unit Price" type="number" step="0.01" {...register(`items.${i}.sellingPrice`, { valueAsNumber: true })} />
                    <Input label="Tax %" type="number" step="0.01" {...register(`items.${i}.taxPercent`, { valueAsNumber: true })} />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Line Total</span>
                      <div className="flex items-center h-9 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {sym}{((Number(watchItems[i]?.qty)||0)*(Number(watchItems[i]?.sellingPrice)||0)*(1+(Number(watchItems[i]?.taxPercent)||0)/100)).toFixed(2)}
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
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200"><span>Total:</span><span className="text-primary-600">{sym}{total.toFixed(2)}</span></div>
          </div>
          <Input label="Notes" {...register("notes")} placeholder="Optional..." />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Record Sale</Button>
          </div>
        </form>
      </Modal>

      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Sale: ${viewModal.saleNumber}`} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{viewModal.customerName || "Walk-in"}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{format(new Date(viewModal.date), "dd MMM yyyy")}</span></div>
              <div><span className="text-gray-500">Payment:</span> <Badge color={payBadge[viewModal.paymentStatus]}>{viewModal.paymentStatus}</Badge></div>
              <div><span className="text-gray-500">Method:</span> <span className="capitalize">{viewModal.paymentMethod}</span></div>
            </div>
            <div className="overflow-x-auto -mx-1">
            <table className="w-full border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Total</th></tr></thead>
              <tbody>{viewModal.items?.map((it, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-700 text-center"><td className="px-3 py-2 text-left">{it.productName}</td><td>{it.qty} {it.unit}</td><td>{sym}{it.sellingPrice}</td><td className="font-medium">{sym}{it.lineTotal?.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
            </div>
            <div className="text-right font-bold text-base">Grand Total: {sym}{viewModal.totalAmount?.toFixed(2)}</div>
            {!viewModal.invoiceId && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => { generateInvoice(viewModal._id || viewModal.id); setViewModal(null); }}><FileText size={14} /> Generate Invoice</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
