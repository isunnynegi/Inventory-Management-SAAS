import { useQuery } from "@tanstack/react-query";
import { platformApi } from "../../api/index.js";
import { StatCard, Card, Spinner, Badge } from "../../components/ui/index.jsx";
import { Building2, Users, CheckCircle, XCircle, TrendingUp, CalendarPlus } from "lucide-react";
import { format } from "date-fns";

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-stats"], queryFn: platformApi.stats });
  if (isLoading) return <Spinner />;

  const { totalOrgs = 0, activeOrgs = 0, inactiveOrgs = 0, newThisMonth = 0, totalUsers = 0, recentOrgs = [] } = data?.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Platform Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">All organizations and users across StockKart.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Organizations" value={totalOrgs}     icon={Building2}    color="indigo" />
        <StatCard label="Active Stores"        value={activeOrgs}   icon={CheckCircle}  color="green"  />
        <StatCard label="Inactive Stores"      value={inactiveOrgs} icon={XCircle}      color="red"    />
        <StatCard label="New This Month"       value={newThisMonth} icon={CalendarPlus} color="blue"   />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} icon={Users} color="purple" />
      </div>

      {/* Recent registrations */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Recent Registrations</h2>
          <a href="/organizations" className="text-xs text-primary-600 hover:underline font-medium">View all →</a>
        </div>
        {recentOrgs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No organizations yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {recentOrgs.map(org => (
                  <tr key={org._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{org.name}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 capitalize">{STORE_TYPE_LABELS[org.storeType] ?? org.storeType}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{org.email || "—"}</td>
                    <td className="py-3">
                      <Badge color={org.isActive ? "green" : "red"}>{org.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">{format(new Date(org.createdAt), "dd MMM yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
