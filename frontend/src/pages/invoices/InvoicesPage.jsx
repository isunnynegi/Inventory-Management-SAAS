import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Badge, Modal } from "../../components/ui/index.jsx";
import { Download, Eye, ExternalLink, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../../stores/authStore.js";

const statusColor = { paid: "green", unpaid: "red", partial: "yellow", cancelled: "gray" };
const statusBg    = { paid: "bg-emerald-500", unpaid: "bg-red-500", partial: "bg-amber-500", cancelled: "bg-gray-400" };

// ── HTML Invoice component (web view + print) ────────────────────────────────
function InvoicePreview({ invoice, org }) {
  const sym = org?.currencySymbol || "₹";
  const money = (n) => `${sym}${(Number(n) || 0).toFixed(2)}`;
  const fmt   = (d) => format(new Date(d), "dd MMM yyyy");
  const balance = Math.max(0, (invoice.grandTotal || 0) - (invoice.amountPaid || 0));

  return (
    <div className="bg-white font-sans text-sm" style={{ minWidth: 640 }}>
      {/* Top accent bar */}
      <div className="h-1.5 bg-primary-600" />

      {/* Header */}
      <div className="px-10 pt-6 pb-4 flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-600 leading-tight">
            {org?.storeName || org?.name || "Business"}
          </h1>
          <div className="mt-1 space-y-0.5 text-xs text-gray-500">
            {(org?.address?.street || org?.address?.city) && (
              <p>{[org.address?.street, org.address?.city, org.address?.state, org.address?.zip].filter(Boolean).join(", ")}</p>
            )}
            {org?.phone && <p>Ph: {org.phone}</p>}
            {org?.email && <p>Email: {org.email}</p>}
            {org?.gstin && <p>GSTIN: <span className="font-mono font-medium text-gray-700">{org.gstin}</span></p>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-gray-800 uppercase tracking-widest">Tax Invoice</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-gray-500">Invoice No: <span className="font-semibold text-gray-900 font-mono">{invoice.invoiceNumber}</span></p>
            <p className="text-gray-500">Date: <span className="font-semibold text-gray-900">{fmt(invoice.date)}</span></p>
            <p className="text-gray-500">Due: <span className="font-semibold text-gray-900">{invoice.dueDate ? fmt(invoice.dueDate) : "On Receipt"}</span></p>
            <p className="text-gray-500">Method: <span className="font-semibold text-gray-900 capitalize">{invoice.paymentMethod || "—"}</span></p>
          </div>
        </div>
      </div>

      {/* Primary divider */}
      <div className="mx-10 h-0.5 bg-primary-600" />

      {/* Bill To / Payment Details box */}
      <div className="mx-10 mt-4 grid grid-cols-2 border border-gray-200 rounded-md overflow-hidden">
        <div className="bg-gray-50 px-5 py-4 border-r border-gray-200">
          <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Bill To</p>
          <p className="font-semibold text-gray-900">{invoice.customerName || "Walk-in Customer"}</p>
          {invoice.customerPhone   && <p className="text-xs text-gray-500 mt-0.5">Ph: {invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-xs text-gray-500 mt-0.5">{invoice.customerAddress}</p>}
        </div>
        <div className="bg-gray-50 px-5 py-4">
          <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Payment Details</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-gray-900">{money(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-semibold text-gray-900">{money(balance)}</span>
            </div>
          </div>
          <span className={`inline-block mt-3 px-2.5 py-0.5 rounded text-xs font-bold text-white ${statusBg[invoice.status] || "bg-gray-400"}`}>
            {(invoice.status || "UNPAID").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Items table */}
      <div className="mx-10 mt-5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary-600 text-white">
              <th className="px-3 py-2 text-center w-8">#</th>
              <th className="px-3 py-2 text-left">Item Description</th>
              <th className="px-3 py-2 text-right w-14">Qty</th>
              <th className="px-3 py-2 text-right w-24">Rate ({sym})</th>
              <th className="px-3 py-2 text-right w-16">Tax %</th>
              <th className="px-3 py-2 text-right w-24">Tax Amt ({sym})</th>
              <th className="px-3 py-2 text-right w-24">Total ({sym})</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-3 py-2.5 text-center text-gray-400">{i + 1}</td>
                <td className="px-3 py-2.5 font-medium text-gray-800">
                  {item.name}
                  {item.unit && <span className="text-gray-400 font-normal"> ({item.unit})</span>}
                </td>
                <td className="px-3 py-2.5 text-right">{item.qty}</td>
                <td className="px-3 py-2.5 text-right">{(item.price || 0).toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right">{item.taxPercent || 0}%</td>
                <td className="px-3 py-2.5 text-right">{(item.taxAmount || 0).toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{(item.lineTotal || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mx-10 mt-4 flex justify-end">
        <div className="w-64">
          <div className="space-y-1.5 text-xs px-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{money(invoice.subtotal)}</span>
            </div>
            {(invoice.discount > 0) && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span><span>- {money(invoice.discount)}</span>
              </div>
            )}
            {(invoice.taxTotal > 0) && (
              <div className="flex justify-between text-gray-600">
                <span>Tax (GST)</span><span>{money(invoice.taxTotal)}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-between bg-primary-600 text-white font-bold text-sm px-4 py-2.5 rounded">
            <span>Grand Total</span>
            <span>{money(invoice.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-10 mt-8 mb-6 pt-4 border-t border-gray-200 flex justify-between items-end">
        <div className="text-xs text-gray-400 space-y-0.5">
          {invoice.notes && <p>Note: {invoice.notes}</p>}
          {invoice.terms && <p>Terms: {invoice.terms}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Thank you for your business!</p>
          <p className="text-xs text-gray-300 mt-0.5">This is a computer generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { organization } = useAuthStore();
  const [page, setPage] = useState(1);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const printRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page],
    queryFn: () => invoiceApi.list({ page, limit: 20 }),
  });

  const downloadPDF = async (invoice) => {
    try {
      const res = await invoiceApi.downloadPDF(invoice._id || invoice.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `${invoice.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download PDF"); }
  };

  const openPDFTab = async (invoice) => {
    try {
      const res = await invoiceApi.downloadPDF(invoice._id || invoice.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error("Failed to open invoice"); }
  };

  const openWebView = async (invoice) => {
    setViewLoading(true);
    try {
      const res = await invoiceApi.get(invoice._id || invoice.id);
      setViewInvoice(res.data);
    } catch { toast.error("Failed to load invoice"); }
    finally { setViewLoading(false); }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <html><head><title>${viewInvoice?.invoiceNumber || "Invoice"}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: sans-serif; font-size: 12px; }
        @media print { @page { margin: 0; } }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Invoice #", render: r => <span className="font-mono font-medium text-primary-600">{r.invoiceNumber}</span> },
    { header: "Customer",  render: r => r.customerName || "—" },
    { header: "Date",      render: r => format(new Date(r.date), "dd MMM yyyy") },
    { header: "Grand Total", render: r => <span className="font-semibold">{organization?.currencySymbol || "₹"}{r.grandTotal?.toFixed(2)}</span> },
    { header: "Status",    render: r => <Badge color={statusColor[r.status]}>{r.status}</Badge> },
    { header: "", cellClassName: "text-right", render: r => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => openWebView(r)} title="Web Preview" disabled={viewLoading}>
          <Eye size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openPDFTab(r)} title="View PDF in browser">
          <ExternalLink size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => downloadPDF(r)} title="Download PDF">
          <Download size={14} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate and download tax invoices</p>
      </div>
      <Card>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No invoices yet. Generate one from a sale." />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {/* Web View Modal */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice — ${viewInvoice.invoiceNumber}` : "Invoice"}
        size="xl"
      >
        {viewInvoice && (
          <>
            {/* Action buttons */}
            <div className="flex justify-end gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer size={14} /> Print
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openPDFTab(viewInvoice)}>
                <ExternalLink size={14} /> View PDF
              </Button>
              <Button size="sm" onClick={() => downloadPDF(viewInvoice)}>
                <Download size={14} /> Download PDF
              </Button>
            </div>

            {/* Invoice preview */}
            <div className="overflow-auto max-h-[70vh] rounded-lg border border-gray-100" ref={printRef}>
              <InvoicePreview invoice={viewInvoice} org={organization} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
