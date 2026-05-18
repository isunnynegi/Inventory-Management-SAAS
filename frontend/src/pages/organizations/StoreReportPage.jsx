import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { platformApi } from "../../api/index.js";
import { StatCard, Card, Spinner, Badge } from "../../components/ui/index.jsx";
import {
  Package, TrendingUp, ShoppingCart, Users, AlertTriangle,
  DollarSign, ArrowLeft, Building2, Activity, Tag,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, formatDistanceToNow } from "date-fns";

const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);
const fmtCur = (n, sym = "₹") => `${sym}${fmt(n)}`;

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

export default function StoreReportPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-report", id],
    queryFn: () => platformApi.storeReport(id),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (isError) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-sm">Failed to load store report.</p>
      <button onClick={() => nav(-1)} className="mt-3 text-primary-600 text-sm hover:underline">← Back</button>
    </div>
  );

  const {
    organization: org = {},
    kpis = {},
    lastActivity,
    recentSales = [],
    recentPurchases = [],
    lowStockList = [],
    monthlySalesChart = [],
  } = data?.data || {};

  const sym = org.currencySymbol || "₹";

  const chartData = monthlySalesChart.map(m => ({
    name: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
    sales: m.total,
    orders: m.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => nav("/organizations")}
          className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{org.name}</h1>
            <Badge color={org.isActive ? "green" : "red"}>{org.isActive ? "Active" : "Inactive"}</Badge>
            {org.isDeleted && <Badge color="red">Deleted</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            <span className="capitalize">{STORE_TYPE_LABELS[org.storeType] ?? org.storeType}</span>
            {org.email && <span>· {org.email}</span>}
            {org.phone && <span>· {org.phone}</span>}
            {org.createdAt && <span>· Joined {format(new Date(org.createdAt), "dd MMM yyyy")}</span>}
          </div>
          {lastActivity && (
            <p className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
              <Activity size={12} />
              Last activity {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
            </p>
          )}
          {!lastActivity && (
            <p className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
              <Activity size={12} />
              No activity recorded yet
            </p>
          )}
        </div>
      </div>

      {/* KPI Row 1 — Sales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales"    value={fmtCur(kpis.todaySales?.total, sym)}    icon={TrendingUp}   color="green"  sub={`${kpis.todaySales?.count || 0} orders`} />
        <StatCard label="Monthly Revenue"  value={fmtCur(kpis.monthlySales?.total, sym)}  icon={DollarSign}   color="indigo" sub={`${kpis.monthlySales?.count || 0} sales`} />
        <StatCard label="All-time Sales"   value={fmtCur(kpis.totalSalesAllTime?.total, sym)} icon={TrendingUp} color="blue" sub={`${kpis.totalSalesAllTime?.count || 0} total orders`} />
        <StatCard label="Monthly Purchases" value={fmtCur(kpis.monthlyPurchases?.total, sym)} icon={ShoppingCart} color="orange" sub={`${kpis.monthlyPurchases?.count || 0} orders`} />
      </div>

      {/* KPI Row 2 — Inventory */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products"  value={fmt(kpis.totalProducts)}  icon={Package}      color="purple" />
        <StatCard label="Categories"      value={fmt(kpis.totalCategories)} icon={Tag}          color="indigo" />
        <StatCard label="Customers"       value={fmt(kpis.totalCustomers)}  icon={Users}        color="blue"   />
        <StatCard label="Low Stock Items" value={kpis.lowStockProducts || 0} icon={AlertTriangle} color={kpis.lowStockProducts > 0 ? "red" : "green"} sub={`of ${kpis.totalProducts || 0} products`} />
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Sales Trend (Last 6 Months)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${sym}${fmt(v)}`} width={70} />
                <Tooltip formatter={(v) => [`${sym}${fmt(v)}`, "Sales"]} />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" /> Low Stock Alert
          </h2>
          {lowStockList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">All stock levels are fine ✅</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[200px]">
              {lowStockList.map(p => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[130px]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.categoryId?.name || "—"}</p>
                  </div>
                  <Badge color="red">{p.stock} {p.unit}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map(s => (
                <div key={s._id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.saleNumber}</p>
                    <p className="text-xs text-gray-400">{s.customerName || "Walk-in"} · {format(new Date(s.date), "dd MMM yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtCur(s.totalAmount, sym)}</p>
                    <Badge color={s.paymentStatus === "paid" ? "green" : s.paymentStatus === "partial" ? "yellow" : "red"}>{s.paymentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Purchases</h2>
          {recentPurchases.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map(p => (
                <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.purchaseNumber}</p>
                    <p className="text-xs text-gray-400">{p.supplierName || "—"} · {format(new Date(p.date), "dd MMM yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtCur(p.totalAmount, sym)}</p>
                    <Badge color={p.paymentStatus === "paid" ? "green" : p.paymentStatus === "partial" ? "yellow" : "red"}>{p.paymentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Store Info */}
      <Card className="p-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-primary-600" /> Store Details
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            { label: "GSTIN",         value: org.gstin || "—" },
            { label: "Currency",      value: org.currency || "—" },
            { label: "Invoice Prefix",value: org.invoicePrefix || "—" },
            { label: "Storefront",    value: org.storefront?.enabled ? "Enabled" : "Disabled" },
            { label: "Address",       value: [org.address?.street, org.address?.city, org.address?.state].filter(Boolean).join(", ") || "—" },
            { label: "Tax Enabled",   value: org.settings?.taxEnabled ? "Yes" : "No" },
            { label: "Suppliers",     value: fmt(kpis.totalSuppliers) },
            { label: "Invoice #",     value: org.invoiceCounter ?? 0 },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
