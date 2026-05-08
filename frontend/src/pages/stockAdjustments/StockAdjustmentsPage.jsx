import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { stockAdjApi, productApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Modal, Badge, Input, Select } from "../../components/ui/index.jsx";
import { Plus, Search, TrendingUp, TrendingDown } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function StockAdjustmentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: "onChange", defaultValues: { type: "increase" } });

  const { data: prodData } = useQuery({ queryKey: ["products-all"], queryFn: () => productApi.list({ limit: 200 }) });
  const products = prodData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["stock-adj", page],
    queryFn: () => stockAdjApi.list({ page, limit: 20 }),
  });

  const mutation = useMutation({
    mutationFn: (d) => stockAdjApi.create({ ...d, qty: Number(d.qty) }),
    onSuccess: () => { qc.invalidateQueries(["stock-adj"]); qc.invalidateQueries(["products"]); toast.success("Stock adjusted!"); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Product", render: r => <span className="font-medium">{r.productId?.name || r.productName}</span> },
    { header: "Type", render: r => (
      <Badge color={r.type === "increase" ? "green" : "red"}>
        {r.type === "increase" ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
        {r.type}
      </Badge>
    )},
    { header: "Qty", render: r => `${r.type === "decrease" ? "-" : "+"}${r.qty}` },
    { header: "Before", render: r => r.previousStock },
    { header: "After", render: r => r.newStock },
    { header: "Reason", render: r => r.reason || "—" },
    { header: "Date", render: r => format(new Date(r.date), "dd MMM yyyy") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock Adjustments</h1><p className="text-sm text-gray-500">Manual stock corrections</p></div>
        <Button onClick={() => { reset({ type: "increase" }); setModal(true); }}><Plus size={16} /> Adjust Stock</Button>
      </div>
      <Card>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No adjustments yet" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Stock Adjustment">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Select label="Product *" error={errors.productId?.message} {...register("productId", { required: "Required" })}>
            <option value="">— Select product —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock} {p.unit})</option>)}
          </Select>
          <Select label="Adjustment Type *" {...register("type", { required: "Required" })}>
            <option value="increase">Increase (Add stock)</option>
            <option value="decrease">Decrease (Remove stock)</option>
          </Select>
          <Input label="Quantity *" type="number" step="0.01" error={errors.qty?.message} {...register("qty", { required: "Required", min: { value: 0.01, message: "Min 0.01" } })} />
          <Input label="Reason" placeholder="e.g. Damaged goods, Theft, Count correction..." {...register("reason")} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
