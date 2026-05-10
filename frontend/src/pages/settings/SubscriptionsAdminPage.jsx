import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "../../api/index.js";
import { Crown, Zap, Star, Search, ChevronRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PLAN_COLORS = {
  free:    "bg-gray-100 text-gray-600",
  starter: "bg-blue-50 text-blue-700",
  pro:     "bg-violet-50 text-violet-700",
};

const STATUS_COLORS = {
  active:    "bg-emerald-50 text-emerald-700",
  expired:   "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function SubscriptionsAdminPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["subs-admin-list", page, search, status],
    queryFn: () => subscriptionApi.adminList({ page, limit: 20, search: search || undefined, status: status || undefined }),
    staleTime: 30_000,
  });

  const subs = data?.data?.docs || [];
  const total = data?.data?.totalDocs || 0;
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} organizations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400"
            placeholder="Search organization…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-primary-400"
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-gray-400">Loading…</div>
        ) : subs.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-gray-400">No subscriptions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payments</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map(sub => {
                const ep = sub.effectivePlanOverride || sub.planSlug || "free";
                const daysLeft = sub.endDate
                  ? Math.ceil((new Date(sub.endDate) - new Date()) / 86400000)
                  : null;
                return (
                  <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{sub.organizationId?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{sub.organizationId?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${PLAN_COLORS[sub.planSlug] || PLAN_COLORS.free}`}>
                        {sub.planSlug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${PLAN_COLORS[ep] || PLAN_COLORS.free}`}>
                        {ep}
                        {sub.effectivePlanOverride && <span className="ml-1 opacity-60">(waiver)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[sub.status] || STATUS_COLORS.active}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.endDate ? (
                        <span className={daysLeft !== null && daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>
                          {new Date(sub.endDate).toLocaleDateString("en-IN")}
                          {daysLeft !== null && <span className="text-xs ml-1 text-gray-400">({daysLeft}d)</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {sub.payments?.length || 0} payment{sub.payments?.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/settings/subscription`} state={{ orgId: sub.organizationId?._id }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors inline-flex">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
