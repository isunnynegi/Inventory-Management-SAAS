import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../api/index.js";
import { StatCard, Card, Spinner, Badge } from "../../components/ui/index.jsx";
import { Package, TrendingUp, ShoppingCart, Users, AlertTriangle, DollarSign } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);
const fmtCur = (n, sym = "₹") => `${sym}${fmt(n)}`;

export default function StoreDashboard() {
  const { organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.stats() });

  if (isLoading) return <Spinner />;
  const { kpis = {}, recentSales = [], recentPurchases = [], lowStockList = [], monthlySalesChart = [] } = data?.data || {};

  const chartData = monthlySalesChart.map(m => ({
    name: `${m._id.year}-${String(m._id.month).padStart(2,"0")}`,
    sales: m.total, orders: m.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={fmtCur(kpis.todaySales?.total, sym)} icon={TrendingUp} color="green" sub={`${kpis.todaySales?.count || 0} orders`} />
        <StatCard label="Today's Purchases" value={fmtCur(kpis.todayPurchases?.total, sym)} icon={ShoppingCart} color="blue" sub={`${kpis.todayPurchases?.count || 0} orders`} />
        <StatCard label="Monthly Revenue" value={fmtCur(kpis.monthlySales?.total, sym)} icon={DollarSign} color="indigo" sub={`${kpis.monthlySales?.count || 0} sales`} />
        <StatCard label="Low Stock Items" value={kpis.lowStockProducts || 0} icon={AlertTriangle} color={kpis.lowStockProducts > 0 ? "red" : "green"} sub={`of ${kpis.totalProducts || 0} products`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={fmt(kpis.totalProducts)} icon={Package} color="purple" />
        <StatCard label="Customers" value={fmt(kpis.totalCustomers)} icon={Users} color="blue" />
        <StatCard label="Monthly Cost" value={fmtCur(kpis.monthlyPurchases?.total, sym)} icon={ShoppingCart} color="orange" sub={`${kpis.monthlyPurchases?.count || 0} purchases`} />
        <StatCard label="Suppliers" value={fmt(kpis.totalSuppliers)} icon={Users} color="indigo" />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Sales Trend (Last 6 Months)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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

        {/* Low Stock */}
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" /> Low Stock Alert
          </h2>
          {lowStockList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">All stock levels are fine ✅</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[200px]">
              {lowStockList.slice(0,8).map(p => (
                <div key={p._id || p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">{p.name}</p>
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
          {recentSales.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No sales yet</p> : (
            <div className="space-y-2">
              {recentSales.map(s => (
                <div key={s._id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.saleNumber}</p>
                    <p className="text-xs text-gray-400">{s.customerName || "Walk-in"} · {format(new Date(s.date), "dd MMM")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtCur(s.totalAmount, sym)}</p>
                    <Badge color={s.paymentStatus==="paid"?"green":s.paymentStatus==="partial"?"yellow":"red"}>{s.paymentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Purchases</h2>
          {recentPurchases.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No purchases yet</p> : (
            <div className="space-y-2">
              {recentPurchases.map(p => (
                <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.purchaseNumber}</p>
                    <p className="text-xs text-gray-400">{p.supplierName || "—"} · {format(new Date(p.date), "dd MMM")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtCur(p.totalAmount, sym)}</p>
                    <Badge color={p.paymentStatus==="paid"?"green":p.paymentStatus==="partial"?"yellow":"red"}>{p.paymentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
