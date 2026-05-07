import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../../api/index.js";
import { Card, StatCard, Button, Spinner } from "../../components/ui/index.jsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { TrendingUp, ShoppingCart, Package, DollarSign } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";

export default function ReportsPage() {
  const { organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const fmt = (n) => `${sym}${new Intl.NumberFormat("en-IN").format(n || 0)}`;
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [tab, setTab] = useState("sales");

  const { data: salesData, isLoading: sl } = useQuery({ queryKey: ["report-sales", from, to], queryFn: () => reportApi.sales({ from, to, groupBy: "day" }) });
  const { data: purchaseData, isLoading: pl } = useQuery({ queryKey: ["report-purchases", from, to], queryFn: () => reportApi.purchases({ from, to, groupBy: "day" }) });
  const { data: stockData, isLoading: stl } = useQuery({ queryKey: ["report-stock"], queryFn: () => reportApi.stock({}) });
  const { data: profitData } = useQuery({ queryKey: ["report-profit", from, to], queryFn: () => reportApi.profit({ from, to }) });

  const sd = salesData?.data || {}; const pd = purchaseData?.data || {}; const prd = profitData?.data || {};
  const salesChart = (sd.chart || []).map(m => ({ name: `${m._id.day||""}/${m._id.month||""}`, total: m.total, orders: m.count }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-gray-900">Reports</h1><p className="text-sm text-gray-500">Business analytics</p></div>
        <div className="flex gap-3 items-center">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          <span className="text-gray-400">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={fmt(sd.summary?.totalRevenue)} icon={TrendingUp} color="green" sub={`${sd.summary?.count || 0} sales`} />
        <StatCard label="Purchase Cost" value={fmt(pd.summary?.totalCost)} icon={ShoppingCart} color="blue" sub={`${pd.summary?.count || 0} purchases`} />
        <StatCard label="Gross Profit" value={fmt(prd.profit)} icon={DollarSign} color={prd.profit >= 0 ? "indigo" : "red"} sub={`${prd.margin || 0}% margin`} />
        <StatCard label="Stock Value" value={fmt(stockData?.data?.totalValue)} icon={Package} color="purple" sub={`${stockData?.data?.totalProducts || 0} products`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100">
        {["sales","purchases","stock"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${tab === t ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "sales" && (
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Daily Sales</h2>
          {sl ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${sym}${v}`} />
                <Tooltip formatter={(v) => [`${sym}${v}`, "Sales"]} />
                <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {sd.topProducts?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-3 text-sm">Top Products by Revenue</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left pb-2">Product</th><th className="text-right pb-2">Qty Sold</th><th className="text-right pb-2">Revenue</th></tr></thead>
                <tbody>{sd.topProducts.slice(0,5).map((p,i) => (
                  <tr key={i} className="border-b border-gray-50"><td className="py-2">{p.name}</td><td className="text-right">{p.totalQty}</td><td className="text-right font-medium">{fmt(p.totalRevenue)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "purchases" && (
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Daily Purchases</h2>
          {pl ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(pd.chart||[]).map(m => ({ name: `${m._id.day||""}/${m._id.month||""}`, total: m.total }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${sym}${v}`} />
                <Tooltip formatter={(v) => [`${sym}${v}`, "Purchases"]} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {tab === "stock" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Stock Summary</h2>
            <div className="text-sm text-gray-500">Total Value: <span className="font-semibold text-gray-800">{fmt(stockData?.data?.totalValue)}</span></div>
          </div>
          {stl ? <Spinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b bg-gray-50"><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Buy Price</th><th className="px-3 py-2">Stock Value</th></tr></thead>
              <tbody>{(stockData?.data?.products || []).map((p,i) => (
                <tr key={i} className={`border-b border-gray-50 text-center ${p.stock <= p.reorderLevel ? "bg-red-50" : ""}`}>
                  <td className="px-3 py-2 text-left font-medium">{p.name}</td>
                  <td>{p.categoryId?.name || "—"}</td>
                  <td className={p.stock <= p.reorderLevel ? "text-red-600 font-semibold" : ""}>{p.stock} {p.unit}</td>
                  <td>{fmt(p.purchasePrice)}</td>
                  <td className="font-medium">{fmt(p.stock * p.purchasePrice)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
