import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef } from "react";

export const cn = (...i) => twMerge(clsx(i));

export function Button({ children, variant="primary", size="md", loading, className, ...p }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
    secondary: "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export const Input = forwardRef(({ label, error, className, ...p }, ref) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <input
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-lg border text-sm outline-none transition bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500",
        error
          ? "border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-gray-200 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30",
        className
      )}
      {...p}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));
Input.displayName = "Input";

export const Select = forwardRef(({ label, error, children, className, ...p }, ref) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <select
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-lg border text-sm outline-none transition bg-white dark:bg-gray-800 dark:text-gray-100",
        error ? "border-red-400" : "border-gray-200 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30",
        className
      )}
      {...p}
    >
      {children}
    </select>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));
Select.displayName = "Select";

export const Textarea = forwardRef(({ label, error, className, ...p }, ref) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500",
        error ? "border-red-400" : "border-gray-200 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30",
        className
      )}
      {...p}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

export function Card({ children, className, ...p }) {
  return <div className={cn("bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm", className)} {...p}>{children}</div>;
}

export function Badge({ children, color="gray" }) {
  const colors = {
    green:  "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    red:    "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    yellow: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
    blue:   "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    gray:   "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    purple: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color] || colors.gray)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, size="md" }) {
  if (!open) return null;
  const sizes = { sm:"max-w-sm", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className={cn("relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full overflow-hidden", sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, data, loading, emptyMsg="No data found" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"><Loader2 className="animate-spin mx-auto" size={24} /></td></tr>
          ) : !data?.length ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">{emptyMsg}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className={cn("px-4 py-3 text-gray-700 dark:text-gray-300", col.cellClassName)}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary-600" size={32} /></div>;
}

export function StatCard({ label, value, icon: Icon, color="indigo", sub }) {
  const colors = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    green:  "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    orange: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    red:    "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    blue:   "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors[color] || colors.indigo)}><Icon size={20} /></div>}
      </div>
    </Card>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title="Confirm", message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 dark:text-gray-300 mb-6">{message || "Are you sure you want to proceed?"}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>Confirm</Button>
      </div>
    </Modal>
  );
}
