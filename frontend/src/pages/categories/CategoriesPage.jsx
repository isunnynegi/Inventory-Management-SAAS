import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { categoryApi } from "../../api/index.js";
import { Button, Card, Pagination, Input, Modal, ConfirmModal } from "../../components/ui/index.jsx";
import { Plus, Pencil, Trash2, Search, ChevronRight, ChevronDown, Tag, FolderOpen } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";

// ─── Category form modal (used for both parent & sub) ─────────────────────
function CategoryModal({ open, onClose, editData, parentCategory }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: "onChange" });

  const title = editData
    ? `Edit ${parentCategory ? "Subcategory" : "Category"}`
    : parentCategory
      ? `Add Subcategory — ${parentCategory.name}`
      : "Add Category";

  const mutation = useMutation({
    mutationFn: (d) => {
      const payload = { name: d.name, description: d.description };
      if (!editData && parentCategory) payload.parentId = parentCategory.id || parentCategory._id;
      return editData
        ? categoryApi.update(editData.id || editData._id, payload)
        : categoryApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(["categories"]);
      // Also invalidate the parent's subcategory cache if relevant
      if (parentCategory) qc.invalidateQueries(["subcategories", parentCategory.id || parentCategory._id]);
      toast.success("Saved!");
      reset();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error saving"),
  });

  const handleOpen = (isOpen) => {
    if (isOpen && editData) reset({ name: editData.name, description: editData.description });
    if (isOpen && !editData) reset({ name: "", description: "" });
  };

  // Reset form when modal opens
  if (open && !mutation.isPending) {
    // handled via key prop below
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form
        key={editData?.id || (parentCategory?.id ?? "new")}
        onSubmit={handleSubmit(d => mutation.mutate(d))}
        className="space-y-4"
      >
        <Input
          label="Name *"
          defaultValue={editData?.name}
          error={errors.name?.message}
          {...register("name", { required: "Required" })}
        />
        <Input
          label="Description"
          defaultValue={editData?.description}
          {...register("description")}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Subcategory row list for an expanded parent ───────────────────────────
function SubcategoryList({ parentId, parentCategory, canEdit }) {
  const qc = useQueryClient();
  const [editSub, setEditSub] = useState(null);
  const [confirmSub, setConfirmSub] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["subcategories", parentId],
    queryFn: () => categoryApi.subcategories(parentId),
  });
  const subs = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["subcategories", parentId]);
      qc.invalidateQueries(["categories"]);
      toast.success("Deleted");
      setConfirmSub(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="ml-10 mr-4 mb-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 overflow-hidden">
      {isLoading ? (
        <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
      ) : (
        <>
          {subs.length === 0 && (
            <p className="text-xs text-gray-400 px-4 py-3 italic">No subcategories yet</p>
          )}
          {subs.map((sub, i) => (
            <div
              key={sub.id || sub._id}
              className={`flex items-center justify-between px-4 py-2.5 ${i < subs.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag size={12} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{sub.name}</span>
                {sub.description && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:block">— {sub.description}</span>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button
                    onClick={() => setEditSub(sub)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setConfirmSub(sub)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 w-full px-4 py-2.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors border-t border-gray-100"
            >
              <Plus size={12} /> Add subcategory
            </button>
          )}
        </>
      )}

      <CategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        parentCategory={parentCategory}
      />
      <CategoryModal
        open={!!editSub}
        onClose={() => setEditSub(null)}
        editData={editSub}
        parentCategory={parentCategory}
      />
      <ConfirmModal
        open={!!confirmSub}
        onClose={() => setConfirmSub(null)}
        onConfirm={() => deleteMutation.mutate(confirmSub?.id || confirmSub?._id)}
        loading={deleteMutation.isPending}
        message={`Delete subcategory "${confirmSub?.name}"?`}
      />
    </div>
  );
}

// ─── Single parent category row ────────────────────────────────────────────
function CategoryRow({ cat, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              title={expanded ? "Collapse" : "Show subcategories"}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <FolderOpen size={14} className="text-primary-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">{cat.description || "—"}</td>
        <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs">{new Date(cat.createdAt).toLocaleDateString("en-IN")}</td>
        <td className="py-3 px-4">
          {canEdit && (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(cat)}><Pencil size={13} /></Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => onDelete(cat)}>
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={4} className="p-0">
            <SubcategoryList
              parentId={cat.id || cat._id}
              parentCategory={cat}
              canEdit={canEdit}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);  // null | { mode: "add" | "edit", data?: cat }
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, search],
    queryFn: () => categoryApi.list({ page, limit: 20, search }),
  });
  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(["categories"]);
      toast.success("Deleted");
      setConfirm(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage categories and their subcategories</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setModal({ mode: "add" })}>
            <Plus size={16} /> Add Category
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 dark:focus:border-primary-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Search categories…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Added</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No categories found</td></tr>
              ) : rows.map(cat => (
                <CategoryRow
                  key={cat.id || cat._id}
                  cat={cat}
                  canEdit={isAdmin()}
                  onEdit={(c) => setModal({ mode: "edit", data: c })}
                  onDelete={(c) => setConfirm(c)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {/* Add / Edit parent category */}
      <CategoryModal
        open={!!modal}
        onClose={() => setModal(null)}
        editData={modal?.mode === "edit" ? modal.data : null}
      />

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm?.id || confirm?._id)}
        loading={deleteMutation.isPending}
        message={`Delete "${confirm?.name}" and all its subcategories?`}
      />
    </div>
  );
}
