import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { platformApi, orgApi } from "../../api/index.js";
import { Card, Badge, Spinner } from "../../components/ui/index.jsx";
import { Search, Building2, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [storeType, setStoreType] = useState("");
  const [page, setPage] = useState(1);

  const { data: typesRes } = useQuery({ queryKey: ["store-types"], queryFn: orgApi.storeTypes, staleTime: Infinity });
  const storeTypes = typesRes?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["organizations", { search, storeType, page }],
    queryFn: () => platformApi.listOrgs({ search: search || undefined, storeType: storeType || undefined, page, limit: 20 }),
    keepPreviousData: true,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }) => platformApi.toggleOrgStatus(id, isActive),
    onSuccess: () => { qc.invalidateQueries(["organizations"]); qc.invalidateQueries(["platform-stats"]); },
    onError: () => toast.error("Failed to update status"),
  });

  const orgs = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Organizations</h1>
        <p className="text-sm text-gray-500">All registered stores on the platform.</p>
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
        <select
          className="input text-sm w-48 appearance-none bg-white"
          value={storeType}
          onChange={e => { setStoreType(e.target.value); setPage(1); }}
        >
          <option value="">All store types</option>
          {storeTypes.map(v => <option key={v} value={v}>{STORE_TYPE_LABELS[v] ?? v}</option>)}
        </select>
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
                <thead className="border-b border-gray-100 bg-gray-50/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Store</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orgs.map(org => (
                    <tr key={org._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{org.name}</p>
                            {org.gstin && <p className="text-[11px] text-gray-400 font-mono">{org.gstin}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-gray-600">{STORE_TYPE_LABELS[org.storeType] ?? org.storeType}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{org.email || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge color={org.isActive ? "green" : "red"}>{org.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{format(new Date(org.createdAt), "dd MMM yyyy")}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleStatus.mutate({ id: org._id, isActive: !org.isActive })}
                          disabled={toggleStatus.isPending}
                          title={org.isActive ? "Deactivate" : "Activate"}
                          className={`p-1.5 rounded-lg transition-colors ${org.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                        >
                          {org.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {orgs.length} of {meta.total} organizations
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
