import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { userApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Modal, Input, Badge, ConfirmModal, SearchableSelect } from "../../components/ui/index.jsx";
import { Plus, UserX, UserCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const roleBadge = { admin: "blue", staff: "gray", superAdmin: "purple" };

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({ mode: "onChange", defaultValues: { role: "staff" } });

  const { data, isLoading } = useQuery({ queryKey: ["users", page], queryFn: () => userApi.list({ page, limit: 20 }) });

  const inviteMutation = useMutation({
    mutationFn: userApi.invite,
    onSuccess: () => { qc.invalidateQueries(["users"]); toast.success("User invited!"); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const toggleMutation = useMutation({ mutationFn: (id) => userApi.toggle(id), onSuccess: () => qc.invalidateQueries(["users"]) });
  const removeMutation = useMutation({ mutationFn: (id) => userApi.remove(id), onSuccess: () => { qc.invalidateQueries(["users"]); setConfirm(null); } });

  const rows = data?.data || []; const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Name", render: r => <span className="font-medium">{r.name}</span> },
    { header: "Email", render: r => r.email },
    { header: "Role", render: r => <Badge color={roleBadge[r.role] || "gray"}>{r.role}</Badge> },
    { header: "Status", render: r => <Badge color={r.isActive ? "green" : "red"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    { header: "Joined", render: r => new Date(r.createdAt).toLocaleDateString("en-IN") },
    { header: "", cellClassName: "text-right", render: r => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(r.id)} title={r.isActive ? "Deactivate" : "Activate"}>
          {r.isActive ? <UserX size={13} className="text-orange-500" /> : <UserCheck size={13} className="text-green-500" />}
        </Button>
        <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-50" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Team</h1><p className="text-sm text-gray-500 dark:text-gray-400">Manage your team members</p></div>
        <Button onClick={() => { reset({ role: "staff" }); setModal(true); }}><Plus size={16} /> Invite User</Button>
      </div>
      <Card>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No team members" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Invite Team Member">
        <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="space-y-4">
          <Input label="Full Name *" error={errors.name?.message} {...register("name", { required: "Required" })} />
          <Input label="Email *" type="email" error={errors.email?.message} {...register("email", { required: "Required" })} />
          <Controller control={control} name="role" render={({ field }) => (
            <SearchableSelect
              label="Role"
              options={[{ value: "staff", label: "Staff" }, { value: "admin", label: "Admin" }]}
              value={field.value}
              onChange={field.onChange}
            />
          )} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={inviteMutation.isPending}>Send Invite</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => removeMutation.mutate(confirm?.id)} loading={removeMutation.isPending} message={`Remove "${confirm?.name}" from team?`} />
    </div>
  );
}
