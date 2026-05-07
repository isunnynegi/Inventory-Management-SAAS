import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoiceApi } from "../../api/index.js";
import { Button, Card, Table, Pagination, Badge } from "../../components/ui/index.jsx";
import { Download, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuthStore } from "../../stores/authStore.js";

const statusColor = { paid: "green", unpaid: "red", partial: "yellow", cancelled: "gray" };

export default function InvoicesPage() {
  const { organization } = useAuthStore();
  const sym = organization?.currencySymbol || "₹";
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page],
    queryFn: () => invoiceApi.list({ page, limit: 20 }),
  });

  const downloadPDF = async (invoice) => {
    try {
      const res = await invoiceApi.downloadPDF(invoice.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `${invoice.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download PDF"); }
  };

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const columns = [
    { header: "Invoice #", render: r => <span className="font-mono font-medium text-primary-600">{r.invoiceNumber}</span> },
    { header: "Customer", render: r => r.customerName || "—" },
    { header: "Date", render: r => format(new Date(r.date), "dd MMM yyyy") },
    { header: "Grand Total", render: r => <span className="font-semibold">{sym}{r.grandTotal?.toFixed(2)}</span> },
    { header: "Status", render: r => <Badge color={statusColor[r.status]}>{r.status}</Badge> },
    { header: "", cellClassName: "text-right", render: r => (
      <Button variant="ghost" size="sm" onClick={() => downloadPDF(r)} title="Download PDF">
        <Download size={14} />
      </Button>
    )},
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-gray-900">Invoices</h1><p className="text-sm text-gray-500">Generate invoices from sales</p></div>
      <Card>
        <Table columns={columns} data={rows} loading={isLoading} emptyMsg="No invoices yet. Generate one from a sale." />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
