import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { categoryApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Input, Modal, ConfirmModal } from "../../components/ui/index.jsx";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: "onChange" });

  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, search],
    queryFn: () => categoryApi.list({ page, limit: 20, search }),
  });

  const mutation = useMutation({
    mutationFn: (d) => modal?.data?.id ? categoryApi.update(modal.data.id, d) : categoryApi.create(d),
    onSuccess: () => { qc.invalidateQueries(["categories"]); toast.success("Saved!"); setModal(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(["categories"]); toast.success("Deleted"); setConfirm(null); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Name", render: r => <span className="font-medium text-gray-900">{r.name}</span> },
    { header: "Description", render: r => <span className="text-gray-500">{r.description || "—"}</span> },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Manage your categories</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => { reset({}); setModal({ mode: "add" }); }}>
            <Plus size={16} /> Add Category
          </Button>
        )}
      </div>
      <Card>
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500"
              placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No categories found" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "add" ? "Add Category" : "Edit Category"}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Input label="Name *" error={errors.name?.message} {...register("name", { required: "Required" })} />
          <Input label="Description" {...register("description")} />
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
