import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { customerApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Input, Modal, ConfirmModal } from "../../components/ui/index.jsx";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";

export default function CustomersPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: "onChange" });

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => customerApi.list({ page, limit: 20, search }),
  });

  const mutation = useMutation({
    mutationFn: (d) => modal?.data?.id ? customerApi.update(modal.data.id, d) : customerApi.create(d),
    onSuccess: () => { qc.invalidateQueries(["customers"]); toast.success("Saved!"); setModal(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customerApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(["customers"]); toast.success("Deleted"); setConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Name", render: r => <span className="font-medium text-gray-900">{r.name}</span> },
    { header: "Phone", render: r => r.phone || "—" }, { header: "Email", render: r => r.email || "—" },
    { header: "GSTIN", render: r => r.gstin ? <span className="font-mono text-xs">{r.gstin}</span> : "—" },
    { header: "Added", render: r => new Date(r.createdAt).toLocaleDateString("en-IN") },
    { header: "", cellClassName: "text-right", render: r => isAdmin() ? (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => { reset(r); setModal({ mode: "edit", data: r }); }}><Pencil size={13} /></Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button>
      </div>
    ) : null },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your customers</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => { reset({}); setModal({ mode: "add" }); }}>
            <Plus size={16} /> Add Customer
          </Button>
        )}
      </div>
      <Card>
        <div className="p-4 border-b border-gray-50 dark:border-gray-700">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 dark:focus:border-primary-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No customers found" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "add" ? "Add Customer" : "Edit Customer"}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Input label="Name *" error={errors.name?.message} {...register("name", { required: "Required" })} />
          <Input label="Phone" {...register("phone")} />
          <Input label="Email" type="email" {...register("email")} />
          <Input label="GSTIN" placeholder="22AAAAA0000A1Z5" {...register("gstin")} />
          <Input label="Address" {...register("address")} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm?.id)}
        loading={deleteMutation.isPending} message={`Delete "${confirm?.name}"?`} />
    </div>
  );
}
