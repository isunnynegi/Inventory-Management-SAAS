import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "../../api/index.js";
import { Search, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const PLAN_COLORS = {
  free:    "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  starter: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  pro:     "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

const STATUS_COLORS = {
  active:    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  expired:   "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  cancelled: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-400 bg-white dark:bg-gray-800 dark:text-gray-100";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Subscriptions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} organizations</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={`pl-9 pr-3 ${inputCls}`}
            placeholder="Search organization…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={inputCls} style={{ width: "auto" }}
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-gray-400 dark:text-gray-500">Loading…</div>
        ) : subs.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-gray-400 dark:text-gray-500">No subscriptions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                {["Organization","Plan","Effective","Status","Expires","Payments",""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {subs.map(sub => {
                const ep = sub.effectivePlanOverride || sub.planSlug || "free";
                const daysLeft = sub.endDate
                  ? Math.ceil((new Date(sub.endDate) - new Date()) / 86400000)
                  : null;
                return (
                  <tr key={sub._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{sub.organizationId?.name || "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{sub.organizationId?.email}</p>
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
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {sub.endDate ? (
                        <span className={daysLeft !== null && daysLeft <= 7 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                          {new Date(sub.endDate).toLocaleDateString("en-IN")}
                          {daysLeft !== null && <span className="text-xs ml-1 text-gray-400 dark:text-gray-500">({daysLeft}d)</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {sub.payments?.length || 0} payment{sub.payments?.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/settings/subscription" state={{ orgId: sub.organizationId?._id }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors inline-flex">
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
                p === page
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
