import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, categoryApi } from "../../api/index.js";
import { useAuthStore } from "../../stores/authStore.js";
import AddProductDrawer from "../../components/inventory/AddProductDrawer.jsx";
import { SearchableSelect } from "../../components/ui/index.jsx";
import { Search, Upload, Download, Plus, LayoutList, LayoutGrid, Pencil, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

// ─── helpers ───────────────────────────────────────────────────
function getAttr(product, key) {
  return product.attributes?.find(a => a.key === key)?.value || "";
}

function stockStatus(product) {
  if (product.stock === 0) return { tone: "danger", label: "Out of stock" };
  if (product.stock <= product.reorderLevel) return { tone: "warning", label: "Low stock" };
  return { tone: "success", label: "In stock" };
}

function fmtINR(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const TONE_PILL = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};
const TONE_DOT = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};
const TONE_STOCK = {
  success: "text-gray-900",
  warning: "text-amber-600 font-semibold",
  danger: "text-red-600 font-semibold",
};

// ─── component ─────────────────────────────────────────────────
export default function ProductsPage() {
  const qc = useQueryClient();
  const { isAdmin, organization } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [subCatFilter, setSubCatFilter] = useState("all");
  const [view, setView] = useState("table"); // "table" | "grid"
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const { data: catData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => categoryApi.list({ limit: 100 }),
  });
  const categories = catData?.data || [];

  const { data: subData } = useQuery({
    queryKey: ["subcategories", catFilter],
    queryFn: () => categoryApi.subcategories(catFilter),
    enabled: catFilter !== "all",
  });
  const subcategories = subData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, catFilter, subCatFilter],
    queryFn: () => productApi.list({
      page,
      limit: 20,
      search,
      categoryId: catFilter !== "all" ? catFilter : undefined,
      subcategory: subCatFilter !== "all" ? subCatFilter : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const rows = data?.data || [];
  const totalDocs = data?.meta?.totalDocs || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const openAdd = () => { setEditProduct(null); setDrawerOpen(true); };
  const openEdit = (p) => { setEditProduct(p); setDrawerOpen(true); };

  const handleDelete = (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    deleteMutation.mutate(p.id);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Inventory</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {totalDocs} products · {organization?.storeType ? (organization.storeType.charAt(0).toUpperCase() + organization.storeType.slice(1)) : "General"} catalog
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
              <Upload size={14} /> Import XLS
            </button>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
              <Download size={14} /> Export
            </button>
            {isAdmin() && (
              <button onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                <Plus size={14} /> Add product
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-50 dark:border-gray-700">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Search products…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              className="min-w-[160px]"
              placeholder="All categories"
              options={[{ value: "all", label: "All categories" }, ...categories.map(c => ({ value: c._id || c.id, label: c.name }))]}
              value={catFilter}
              onChange={v => { setCatFilter(v); setSubCatFilter("all"); setPage(1); }}
            />
            {catFilter !== "all" && subcategories.length > 0 && (
              <SearchableSelect
                className="min-w-[160px]"
                placeholder="All subcategories"
                options={[{ value: "all", label: "All subcategories" }, ...subcategories.map(s => ({ value: s.name, label: s.name }))]}
                value={subCatFilter}
                onChange={v => { setSubCatFilter(v); setPage(1); }}
              />
            )}
            <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 ml-auto">
              <button onClick={() => setView("table")}
                className={`p-1.5 rounded ${view === "table" ? "bg-white dark:bg-gray-600 shadow-sm text-primary-600" : "text-gray-400 hover:text-gray-600"} transition-colors`}>
                <LayoutList size={15} />
              </button>
              <button onClick={() => setView("grid")}
                className={`p-1.5 rounded ${view === "grid" ? "bg-white dark:bg-gray-600 shadow-sm text-primary-600" : "text-gray-400 hover:text-gray-600"} transition-colors`}>
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>

          {/* Table view */}
          {view === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-700">
                    <th className="w-9 px-4 py-3"><input type="checkbox" className="rounded accent-primary-600" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU / Barcode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {isLoading && (
                    <tr><td colSpan={10} className="py-16 text-center text-sm text-gray-400">Loading…</td></tr>
                  )}
                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="text-3xl mb-2">📦</div>
                        <p className="text-sm text-gray-500">No products found</p>
                        {isAdmin() && <button onClick={openAdd} className="mt-3 text-xs text-primary-600 font-medium hover:underline">+ Add your first product</button>}
                      </td>
                    </tr>
                  )}
                  {rows.map(p => {
                    const { tone, label } = stockStatus(p);
                    const brand = getAttr(p, "brand");
                    const subcategory = getAttr(p, "subcategory");
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                        <td className="px-4 py-3"><input type="checkbox" className="rounded accent-primary-600" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0 font-medium text-gray-600">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{p.name}</p>
                              {subcategory && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subcategory}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.sku && <p className="font-mono text-[11px] text-gray-700 dark:text-gray-300">{p.sku}</p>}
                          {p.barcode && <p className="font-mono text-[10.5px] text-gray-400 dark:text-gray-500">{p.barcode}</p>}
                          {!p.sku && !p.barcode && <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{p.categoryId?.name || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{brand || "—"}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{fmtINR(p.purchasePrice)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtINR(p.sellingPrice)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold text-sm ${TONE_STOCK[tone]}`}>{p.stock}</span>
                          <span className="text-[11px] text-gray-400 ml-1">{p.unit}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${TONE_PILL[tone]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAdmin() && (
                              <>
                                <button onClick={() => openEdit(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Grid view */}
          {view === "grid" && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {isLoading && <p className="col-span-full py-12 text-center text-sm text-gray-400">Loading…</p>}
              {!isLoading && rows.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm text-gray-500">No products found</p>
                </div>
              )}
              {rows.map(p => {
                const { tone } = stockStatus(p);
                const brand = getAttr(p, "brand");
                return (
                  <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => isAdmin() && openEdit(p)}>
                    <div className="w-full aspect-square rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-4xl mb-3">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 truncate">{brand || "—"}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TONE_PILL[tone]}`}>{p.stock}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">{p.name}</p>
                    <p className="text-sm font-semibold text-primary-600 mt-1">{fmtINR(p.sellingPrice)}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs dark:text-gray-300">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs dark:text-gray-300">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit drawer */}
      <AddProductDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditProduct(null); }}
        editProduct={editProduct}
      />
    </>
  );
}
