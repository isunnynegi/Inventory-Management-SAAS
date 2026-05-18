import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { platformApi, orgApi } from "../../api/index.js";
import { Card, Badge, Spinner, Modal, Button, SearchableSelect } from "../../components/ui/index.jsx";
import { Search, Building2, ToggleLeft, ToggleRight, Trash2, Trash, UserCheck, AlertTriangle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

function DeleteConfirmModal({ org, onClose, onSoftDelete, onForceDelete, softPending, forcePending }) {
  if (!org) return null;
  const isAlreadyDeleted = org.isDeleted;
  return (
    <Modal open={!!org} onClose={onClose} title={isAlreadyDeleted ? "Permanently Delete Store" : "Delete Store"} size="sm">
      <div className="space-y-4">
        {isAlreadyDeleted ? (
          <>
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">This store is already soft-deleted.</p>
                <p className="text-sm text-red-600 mt-0.5">Force delete will permanently remove all store data including products, customers, sales, invoices, and users. This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Store: <strong>{org.name}</strong></p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={() => onForceDelete(org._id)} loading={forcePending}>
                Force Delete Permanently
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Soft-deleting <strong>{org.name}</strong> will deactivate the store and hide all its data. The data can be permanently removed later.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={() => onSoftDelete(org._id)} loading={softPending}>
                Delete Store
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { startImpersonation } = useAuthStore();
  const [search, setSearch] = useState("");
  const [storeType, setStoreType] = useState("");
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: typesRes } = useQuery({ queryKey: ["store-types"], queryFn: orgApi.storeTypes, staleTime: Infinity });
  const storeTypes = typesRes?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["organizations", { search, storeType, page, showDeleted }],
    queryFn: () => platformApi.listOrgs({
      search: search || undefined,
      storeType: storeType || undefined,
      page,
      limit: 20,
      includeDeleted: showDeleted ? "true" : undefined,
    }),
    keepPreviousData: true,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }) => platformApi.toggleOrgStatus(id, isActive),
    onSuccess: () => { qc.invalidateQueries(["organizations"]); qc.invalidateQueries(["platform-stats"]); },
    onError: () => toast.error("Failed to update status"),
  });

  const softDelete = useMutation({
    mutationFn: (id) => platformApi.deleteOrg(id),
    onSuccess: () => {
      toast.success("Store deleted");
      setDeleteTarget(null);
      qc.invalidateQueries(["organizations"]);
      qc.invalidateQueries(["platform-stats"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Delete failed"),
  });

  const forceDelete = useMutation({
    mutationFn: (id) => platformApi.forceDeleteOrg(id),
    onSuccess: () => {
      toast.success("Store permanently deleted");
      setDeleteTarget(null);
      qc.invalidateQueries(["organizations"]);
      qc.invalidateQueries(["platform-stats"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Force delete failed"),
  });

  const impersonate = useMutation({
    mutationFn: (id) => platformApi.impersonate(id),
    onSuccess: ({ data }) => {
      startImpersonation(data.token, data.orgName);
      nav("/settings");
      toast.success(`Now editing ${data.orgName}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Impersonation failed"),
  });

  const orgs = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Organizations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">All registered stores on the platform.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={e => { setShowDeleted(e.target.checked); setPage(1); }}
            className="rounded border-gray-300"
          />
          Show deleted stores
        </label>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <SearchableSelect
          className="w-48"
          placeholder="All store types"
          options={[{ value: "", label: "All store types" }, ...storeTypes.map(v => ({ value: v, label: STORE_TYPE_LABELS[v] ?? v }))]}
          value={storeType}
          onChange={v => { setStoreType(v); setPage(1); }}
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No organizations found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Store</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {orgs.map(org => (
                    <tr key={org._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${org.isDeleted ? "opacity-60" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{org.name}</p>
                            {org.gstin && <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{org.gstin}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{STORE_TYPE_LABELS[org.storeType] ?? org.storeType}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{org.email || "—"}</td>
                      <td className="py-3 px-4">
                        {org.isDeleted
                          ? <Badge color="red">Deleted</Badge>
                          : <Badge color={org.isActive ? "green" : "red"}>{org.isActive ? "Active" : "Inactive"}</Badge>
                        }
                      </td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs">{format(new Date(org.createdAt), "dd MMM yyyy")}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => nav(`/organizations/${org._id}/report`)}
                            title="View store report"
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          >
                            <BarChart3 size={16} />
                          </button>
                          {!org.isDeleted && (
                            <>
                              <button
                                onClick={() => toggleStatus.mutate({ id: org._id, isActive: !org.isActive })}
                                disabled={toggleStatus.isPending}
                                title={org.isActive ? "Deactivate" : "Activate"}
                                className={`p-1.5 rounded-lg transition-colors ${org.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                              >
                                {org.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                              </button>
                              <button
                                onClick={() => impersonate.mutate(org._id)}
                                disabled={impersonate.isPending}
                                title="Edit store settings"
                                className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 transition-colors"
                              >
                                <UserCheck size={16} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(org)}
                            title={org.isDeleted ? "Force delete" : "Delete store"}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          >
                            {org.isDeleted ? <Trash size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing {orgs.length} of {meta.total} organizations
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <DeleteConfirmModal
        org={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSoftDelete={(id) => softDelete.mutate(id)}
        onForceDelete={(id) => forceDelete.mutate(id)}
        softPending={softDelete.isPending}
        forcePending={forceDelete.isPending}
      />
    </div>
  );
}
