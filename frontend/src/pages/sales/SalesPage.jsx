import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { saleApi, customerApi, productApi, invoiceApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Modal, Badge, Input, Select } from "../../components/ui/index.jsx";
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

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm({
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

  const onProductSelect = (i, pid) => {
    const p = products.find(x => x.id === pid);
    if (p) { /* price auto-fill handled by onChange */ }
  };

  const createMutation = useMutation({
    mutationFn: (d) => {
      const items = d.items.map(i => {
        const lineBase = Number(i.qty) * Number(i.sellingPrice);
        const taxAmt = lineBase * (Number(i.taxPercent) / 100);
        return { ...i, qty: Number(i.qty), sellingPrice: Number(i.sellingPrice), taxPercent: Number(i.taxPercent), taxAmount: taxAmt, lineTotal: lineBase + taxAmt };
      });
      const custObj = customers.find(c => c.id === d.customerId);
      return saleApi.create({ ...d, items, subtotal, taxTotal, discount: Number(d.discount), totalAmount: total, amountPaid: Number(d.amountPaid), customerName: custObj?.name });
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
        {!r.invoiceId && <Button variant="ghost" size="sm" onClick={() => generateInvoice(r.id)} title="Generate Invoice"><FileText size={13} /></Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Sales</h1><p className="text-sm text-gray-500">Stock-out records</p></div>
        <Button onClick={() => { reset({ items: [{ productId: "", qty: 1, sellingPrice: 0, taxPercent: 0 }], discount: 0, amountPaid: 0, paymentMethod: "cash" }); setModal(true); }}><Plus size={16} /> New Sale</Button>
      </div>
      <Card>
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500" placeholder="Search sale number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No sales yet" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Customer" {...register("customerId")}>
              <option value="">— Walk-in Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
            </Select>
            <Input label="Date" type="date" defaultValue={new Date().toISOString().split("T")[0]} {...register("date")} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Items *</p>
              <button type="button" onClick={() => append({ productId: "", qty: 1, sellingPrice: 0, taxPercent: 0 })} className="text-primary-600 text-xs flex items-center gap-1 hover:underline"><PlusCircle size={13} /> Add item</button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => {
                const selProd = products.find(p => p.id === watchItems[i]?.productId);
                return (
                  <div key={f.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                        {...register(`items.${i}.productId`, { required: true, onChange: (e) => {
                          const p = products.find(x => x.id === e.target.value);
                          if (p) { document.querySelectorAll(`[name="items.${i}.sellingPrice"]`)[0].value = p.sellingPrice; }
                        }})}>
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock} {p.unit}</option>)}
                      </select>
                    </div>
                    <div className="w-20"><Input type="number" step="0.01" placeholder="Qty" {...register(`items.${i}.qty`, { valueAsNumber: true })} /></div>
                    <div className="w-28"><Input type="number" step="0.01" placeholder="Price" defaultValue={selProd?.sellingPrice || 0} {...register(`items.${i}.sellingPrice`, { valueAsNumber: true })} /></div>
                    <div className="w-20"><Input type="number" step="0.01" placeholder="Tax%" {...register(`items.${i}.taxPercent`, { valueAsNumber: true })} /></div>
                    <div className="w-28 pb-1 text-sm font-medium">
                      {sym}{((Number(watchItems[i]?.qty)||0)*(Number(watchItems[i]?.sellingPrice)||0)*(1+(Number(watchItems[i]?.taxPercent)||0)/100)).toFixed(2)}
                    </div>
                    {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 pb-1"><MinusCircle size={18} /></button>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Discount" type="number" step="0.01" {...register("discount", { valueAsNumber: true })} />
            <Input label="Amount Paid" type="number" step="0.01" {...register("amountPaid", { valueAsNumber: true })} />
            <Select label="Payment" {...register("paymentMethod")}>
              {["cash","bank","upi","credit","other"].map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
            </Select>
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
            <table className="w-full border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Total</th></tr></thead>
              <tbody>{viewModal.items?.map((it, i) => (
                <tr key={i} className="border-t border-gray-50 text-center"><td className="px-3 py-2 text-left">{it.productName}</td><td>{it.qty} {it.unit}</td><td>{sym}{it.sellingPrice}</td><td className="font-medium">{sym}{it.lineTotal?.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
            <div className="text-right font-bold text-base">Grand Total: {sym}{viewModal.totalAmount?.toFixed(2)}</div>
            {!viewModal.invoiceId && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => { generateInvoice(viewModal.id); setViewModal(null); }}><FileText size={14} /> Generate Invoice</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
