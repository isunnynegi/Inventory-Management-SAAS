import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef } from "react";

export const cn = (...i) => twMerge(clsx(i));

export function Button({ children, variant="primary", size="md", loading, className, ...p }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-gray-600 hover:bg-gray-100",
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
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      ref={ref}
      className={cn("w-full px-3 py-2 rounded-lg border text-sm outline-none transition",
        error ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
        className)}
      {...p}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));
Input.displayName = "Input";

export const Select = forwardRef(({ label, error, children, className, ...p }, ref) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      ref={ref}
      className={cn("w-full px-3 py-2 rounded-lg border text-sm outline-none bg-white transition",
        error ? "border-red-400" : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100", className)}
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
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea
      ref={ref}
      className={cn("w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition",
        error ? "border-red-400" : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100", className)}
      {...p}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

export function Card({ children, className, ...p }) {
  return <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm", className)} {...p}>{children}</div>;
}

export function Badge({ children, color="gray" }) {
  const colors = { green:"bg-green-100 text-green-700", red:"bg-red-100 text-red-700", yellow:"bg-yellow-100 text-yellow-700", blue:"bg-blue-100 text-blue-700", gray:"bg-gray-100 text-gray-700", purple:"bg-purple-100 text-purple-700" };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color] || colors.gray)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, size="md" }) {
  if (!open) return null;
  const sizes = { sm:"max-w-sm", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative bg-white rounded-xl shadow-xl w-full overflow-hidden", sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
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
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" size={24} /></td></tr>
          ) : !data?.length ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMsg}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50/50 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className={cn("px-4 py-3 text-gray-700", col.cellClassName)}>
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
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
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors[color] || colors.indigo)}><Icon size={20} /></div>}
      </div>
    </Card>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title="Confirm", message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message || "Are you sure you want to proceed?"}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>Confirm</Button>
      </div>
    </Modal>
  );
}
