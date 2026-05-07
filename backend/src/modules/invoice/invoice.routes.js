import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Invoice from "./invoice.model.js";
import Sale from "../sale/sale.model.js";
import Organization from "../organization/organization.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import PDFDocument from "pdfkit";

// Auto-generate invoice number
const genInvoiceNumber = async (org) => {
  org.invoiceCounter = (org.invoiceCounter || 0) + 1;
  await org.save({ validateBeforeSave: false });
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`;
  return `${org.invoicePrefix || "INV"}-${ym}-${String(org.invoiceCounter).padStart(4,"0")}`;
};

// Generate invoice from sale
export const fromSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.saleId, organizationId: req.organizationId });
  if (!sale) throw ApiError.notFound("Sale not found");
  const existing = await Invoice.findOne({ saleId: sale._id }).lean();
  if (existing) throw ApiError.conflict("Invoice already exists for this sale");

  const org = await Organization.findById(req.organizationId);
  const invoiceNumber = await genInvoiceNumber(org);

  const items = sale.items.map(i => ({
    productId: i.productId, name: i.productName, qty: i.qty,
    unit: i.unit, price: i.sellingPrice, taxPercent: i.taxPercent,
    taxAmount: i.taxAmount, lineTotal: i.lineTotal,
  }));

  const invoice = await Invoice.create({
    invoiceNumber, saleId: sale._id,
    customerId: sale.customerId, customerName: sale.customerName,
    items, subtotal: sale.subtotal, discount: sale.discount, taxTotal: sale.taxTotal,
    grandTotal: sale.totalAmount, amountPaid: sale.amountPaid,
    status: sale.paymentStatus, paymentMethod: sale.paymentMethod,
    date: sale.date, organizationId: req.organizationId, createdBy: req.user._id,
  });
  await Sale.findByIdAndUpdate(sale._id, { invoiceId: invoice._id });
  return ApiResponse.created(res, "Invoice created", invoice);
});

// Create invoice directly
export const create = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.organizationId);
  const invoiceNumber = await genInvoiceNumber(org);
  const invoice = await Invoice.create({ ...req.body, invoiceNumber, organizationId: req.organizationId, createdBy: req.user._id });
  return ApiResponse.created(res, "Invoice created", invoice);
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, status, from, to, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (status) filter.status = status;
  if (search) filter.$or = [
    { invoiceNumber: { $regex: search, $options: "i" } },
    { customerName: { $regex: search, $options: "i" } },
  ];
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(new Date(to).setHours(23,59,59,999));
  }
  const result = await paginate(Invoice, filter, { page, limit });
  return ApiResponse.paginated(res, "Invoices", result);
});

export const getOne = asyncHandler(async (req, res) => {
  const doc = await Invoice.findOne({ _id: req.params.id, organizationId: req.organizationId })
    .populate("customerId", "name phone email address");
  if (!doc) throw ApiError.notFound("Invoice not found");
  return ApiResponse.ok(res, "Invoice", doc);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const doc = await Invoice.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { status: req.body.status, amountPaid: req.body.amountPaid, updatedBy: req.user._id },
    { new: true }
  );
  if (!doc) throw ApiError.notFound("Invoice not found");
  return ApiResponse.ok(res, "Invoice updated", doc);
});

// ── PDF Generation ─────────────────────────────────────────────────────────────
export const downloadPDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: req.organizationId }).lean();
  if (!invoice) throw ApiError.notFound("Invoice not found");
  const org = await Organization.findById(req.organizationId).lean();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const colors = { primary: "#4F46E5", dark: "#1F2937", gray: "#6B7280", light: "#F9FAFB", border: "#E5E7EB" };
  const W = 515;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 100).fill(colors.primary);
  doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text(org.name || "Business Name", 40, 25);
  doc.fontSize(9).font("Helvetica");
  if (org.address?.street) doc.text(org.address.street, 40, 52);
  const cityLine = [org.address?.city, org.address?.state, org.address?.zip].filter(Boolean).join(", ");
  if (cityLine) doc.text(cityLine, 40, 64);
  if (org.phone) doc.text(`Ph: ${org.phone}`, 40, 76);
  if (org.gstin) doc.text(`GSTIN: ${org.gstin}`, 300, 52);

  // TAX INVOICE label
  doc.fillColor("white").fontSize(16).font("Helvetica-Bold").text("TAX INVOICE", 380, 30, { width: 175, align: "right" });

  // ── Invoice Meta ─────────────────────────────────────────────────────────────
  doc.rect(40, 115, W, 60).fill(colors.light).stroke(colors.border);
  doc.fillColor(colors.dark).fontSize(9).font("Helvetica-Bold");
  doc.text("Invoice No:", 50, 125).text("Date:", 50, 140).text("Due Date:", 50, 155);
  doc.font("Helvetica");
  doc.text(invoice.invoiceNumber, 130, 125);
  doc.text(new Date(invoice.date).toLocaleDateString("en-IN"), 130, 140);
  doc.text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "On Receipt", 130, 155);

  // Customer block
  doc.font("Helvetica-Bold").text("Bill To:", 300, 125);
  doc.font("Helvetica").text(invoice.customerName || "Walk-in Customer", 300, 140);
  if (invoice.customerPhone) doc.text(`Ph: ${invoice.customerPhone}`, 300, 155);

  // ── Items Table ───────────────────────────────────────────────────────────────
  const tableY = 195;
  const cols = { sno: 40, item: 65, qty: 320, rate: 360, tax: 415, total: 460 };

  // Table header
  doc.rect(40, tableY, W, 20).fill(colors.primary);
  doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
  doc.text("#", cols.sno, tableY + 6);
  doc.text("Item", cols.item, tableY + 6);
  doc.text("Qty", cols.qty, tableY + 6);
  doc.text("Rate", cols.rate, tableY + 6);
  doc.text("Tax%", cols.tax, tableY + 6);
  doc.text("Total", cols.total, tableY + 6);

  let y = tableY + 25;
  doc.fillColor(colors.dark).font("Helvetica").fontSize(8);
  invoice.items.forEach((item, i) => {
    const bg = i % 2 === 0 ? "white" : colors.light;
    doc.rect(40, y - 3, W, 18).fill(bg);
    doc.fillColor(colors.dark);
    doc.text(String(i + 1), cols.sno, y);
    doc.text(item.name.substring(0, 38), cols.item, y, { width: 240 });
    doc.text(`${item.qty} ${item.unit || ""}`, cols.qty, y);
    doc.text(`${org.currencySymbol || "₹"}${item.price.toFixed(2)}`, cols.rate, y);
    doc.text(`${item.taxPercent || 0}%`, cols.tax, y);
    doc.text(`${org.currencySymbol || "₹"}${item.lineTotal.toFixed(2)}`, cols.total, y);
    y += 18;
  });

  // ── Totals ────────────────────────────────────────────────────────────────────
  y += 10;
  doc.moveTo(40, y).lineTo(555, y).strokeColor(colors.border).stroke();
  y += 10;
  const sym = org.currencySymbol || "₹";
  const totalsX = 360;
  const row = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    doc.fillColor(colors.gray).text(label, totalsX, y, { width: 90, align: "right" });
    doc.fillColor(colors.dark).text(`${sym}${value.toFixed(2)}`, 460, y, { width: 95, align: "right" });
    y += 16;
  };
  row("Subtotal:", invoice.subtotal || 0);
  if (invoice.discount) row("Discount:", invoice.discount);
  if (invoice.taxTotal) row("Tax:", invoice.taxTotal);
  y += 2;
  doc.rect(350, y - 2, W - 310, 22).fill(colors.primary);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
  doc.text("Grand Total:", totalsX, y + 4, { width: 90, align: "right" });
  doc.text(`${sym}${invoice.grandTotal.toFixed(2)}`, 460, y + 4, { width: 95, align: "right" });
  y += 30;

  // Payment status badge
  const statusColors = { paid: "#10B981", unpaid: "#EF4444", partial: "#F59E0B", cancelled: "#6B7280" };
  const sc = statusColors[invoice.status] || "#6B7280";
  doc.rect(40, y, 80, 18).fill(sc);
  doc.fillColor("white").fontSize(9).font("Helvetica-Bold").text(invoice.status.toUpperCase(), 40, y + 5, { width: 80, align: "center" });

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = 750;
  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(colors.border).stroke();
  doc.fillColor(colors.gray).fontSize(8).font("Helvetica");
  doc.text(invoice.notes || "Thank you for your business!", 40, footerY + 8, { align: "center", width: W });
  if (invoice.terms) doc.text(`Terms: ${invoice.terms}`, 40, footerY + 20, { align: "center", width: W });

  doc.end();
});

const router = Router();
router.use(authenticate);
router.post("/from-sale/:saleId", authorize("admin","superAdmin","staff"), fromSale);
router.post("/",                  authorize("admin","superAdmin","staff"), create);
router.get("/",                   list);
router.get("/:id",                getOne);
router.patch("/:id/status",       authorize("admin","superAdmin"), updateStatus);
router.get("/:id/pdf",            downloadPDF);
export default router;
