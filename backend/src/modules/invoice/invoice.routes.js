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

// ── Shared invoice renderer (used by both PDF download and HTML view) ───────────
function buildPDF(doc, invoice, org) {
  const C = {
    primary:  "#4F46E5", primaryDark: "#3730A3", primaryLight: "#EEF2FF",
    dark:  "#111827", mid: "#374151", gray: "#6B7280",
    light: "#F9FAFB", border: "#E5E7EB", white: "#FFFFFF",
    green: "#10B981", red: "#EF4444", amber: "#F59E0B",
  };
  const sym   = org.currencySymbol || "₹";
  const PW    = 595;   // A4 width
  const M     = 40;    // margin
  const W     = PW - M * 2; // 515
  const MID   = M + Math.floor(W / 2);
  const HALF  = Math.floor(W / 2);
  const ROW_H = 18;

  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const money = (n) => `${sym}${(Number(n) || 0).toFixed(2)}`;

  // ── Top accent bar ────────────────────────────────────────
  doc.rect(0, 0, PW, 5).fill(C.primary);

  // ── Header: store name (left) | TAX INVOICE + meta (right) ───
  let y = 18;
  doc.fillColor(C.primary).fontSize(18).font("Helvetica-Bold")
     .text(org.storeName || org.name || "Business", M, y, { width: HALF - 10, lineBreak: false });

  doc.fillColor(C.dark).fontSize(11).font("Helvetica-Bold")
     .text("TAX INVOICE", MID + 10, y, { width: HALF - 10, align: "right", lineBreak: false });

  y += 22;

  // Org sub-info (left)
  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica");
  const addrParts = [org.address?.street, org.address?.city, org.address?.state, org.address?.zip].filter(Boolean);
  if (addrParts.length) { doc.text(addrParts.join(", "), M, y, { width: HALF - 10, lineBreak: false }); y += 11; }
  if (org.phone)  { doc.text(`Ph: ${org.phone}`,    M, y, { lineBreak: false }); y += 11; }
  if (org.email)  { doc.text(`Email: ${org.email}`, M, y, { lineBreak: false }); y += 11; }
  if (org.gstin)  { doc.text(`GSTIN: ${org.gstin}`, M, y, { lineBreak: false }); y += 11; }

  // Invoice meta (right column, aligned with store sub-info)
  const metaStartY = 40;
  const lX = MID + 10, vX = MID + 80;
  const metaRow = (label, value, ry) => {
    doc.fillColor(C.gray).fontSize(7.5).font("Helvetica-Bold").text(label, lX, ry, { width: 65, lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica").text(value, vX, ry, { width: HALF - 50, lineBreak: false });
  };
  metaRow("Invoice No :", invoice.invoiceNumber, metaStartY);
  metaRow("Date       :", fmt(invoice.date), metaStartY + 12);
  metaRow("Due Date   :", invoice.dueDate ? fmt(invoice.dueDate) : "On Receipt", metaStartY + 24);
  metaRow("Pay Method :", invoice.paymentMethod
    ? invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1)
    : "—", metaStartY + 36);

  y = Math.max(y, metaStartY + 52) + 6;

  // ── Primary divider ───────────────────────────────────────
  doc.rect(M, y, W, 2).fill(C.primary);
  y += 10;

  // ── Info box: Bill To (left) | Payment Details (right) ───
  const BOX_H = 82;
  doc.rect(M, y, W, BOX_H).fill(C.light);
  doc.rect(M, y, W, BOX_H).lineWidth(0.5).stroke(C.border);

  // Bill To
  doc.fillColor(C.primary).fontSize(7).font("Helvetica-Bold")
     .text("BILL TO", M + 8, y + 7, { lineBreak: false });
  doc.fillColor(C.dark).fontSize(9).font("Helvetica-Bold")
     .text(invoice.customerName || "Walk-in Customer", M + 8, y + 17, { width: HALF - 18, lineBreak: false });
  doc.fillColor(C.mid).fontSize(7.5).font("Helvetica");
  let cy = y + 30;
  if (invoice.customerPhone)   { doc.text(`Ph: ${invoice.customerPhone}`,    M + 8, cy, { width: HALF - 18, lineBreak: false }); cy += 11; }
  if (invoice.customerAddress) { doc.text(invoice.customerAddress,            M + 8, cy, { width: HALF - 18, lineBreak: false }); cy += 11; }

  // Vertical separator
  doc.moveTo(MID, y + 8).lineTo(MID, y + BOX_H - 8).lineWidth(0.5).strokeColor(C.border).stroke();

  // Payment Details (right)
  doc.fillColor(C.primary).fontSize(7).font("Helvetica-Bold")
     .text("PAYMENT DETAILS", MID + 10, y + 7, { lineBreak: false });

  const pLX = MID + 10, pVX = MID + 75;
  let py = y + 19;
  const pRow = (lbl, val) => {
    doc.fillColor(C.gray).fontSize(7.5).font("Helvetica-Bold").text(lbl, pLX, py, { width: 60, lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica").text(val, pVX, py, { width: HALF - 45, lineBreak: false });
    py += 12;
  };
  pRow("Paid :", money(invoice.amountPaid));
  pRow("Balance :", money(Math.max(0, invoice.grandTotal - (invoice.amountPaid || 0))));

  // Status badge
  const stC = { paid: C.green, unpaid: C.red, partial: C.amber, cancelled: C.gray };
  doc.rect(pLX, py + 2, 48, 14).fill(stC[invoice.status] || C.gray);
  doc.fillColor(C.white).fontSize(7).font("Helvetica-Bold")
     .text((invoice.status || "UNPAID").toUpperCase(), pLX, py + 5.5, { width: 48, align: "center", lineBreak: false });

  y += BOX_H + 12;

  // ── Items table ───────────────────────────────────────────
  // Column x positions (right-edge of each cell for right-aligned values)
  const cSno   = M;          // 40
  const cItem  = M + 20;     // 60
  const cQty   = M + 300;    // 340
  const cRate  = M + 355;    // 395
  const cTaxP  = M + 405;    // 445
  const cTaxA  = M + 445;    // 485
  const cTotal = M + 515;    // 555 (right edge)

  // Header row
  doc.rect(M, y, W, ROW_H).fill(C.primary);
  doc.fillColor(C.white).fontSize(7.5).font("Helvetica-Bold");
  doc.text("#",            cSno,  y + 5.5, { width: 18, align: "center", lineBreak: false });
  doc.text("Item Description", cItem, y + 5.5, { width: 275, lineBreak: false });
  doc.text("Qty",          cQty,  y + 5.5, { width: 50, align: "right", lineBreak: false });
  doc.text(`Rate(${sym})`, cRate, y + 5.5, { width: 45, align: "right", lineBreak: false });
  doc.text("Tax%",         cTaxP, y + 5.5, { width: 35, align: "right", lineBreak: false });
  doc.text(`Tax(${sym})`,  cTaxA, y + 5.5, { width: 40, align: "right", lineBreak: false });
  doc.text(`Total(${sym})`,cTotal - 35, y + 5.5, { width: 35, align: "right", lineBreak: false });
  y += ROW_H;

  // Item rows
  doc.fontSize(8).font("Helvetica");
  invoice.items.forEach((item, i) => {
    doc.rect(M, y, W, ROW_H).fill(i % 2 === 0 ? C.white : C.light);
    doc.fillColor(C.dark);
    doc.text(String(i + 1),                   cSno,  y + 5, { width: 18, align: "center", lineBreak: false });
    const label = `${item.name}${item.unit ? ` (${item.unit})` : ""}`;
    doc.text(label.substring(0, 46),           cItem, y + 5, { width: 275, lineBreak: false });
    doc.text(String(item.qty),                 cQty,  y + 5, { width: 50, align: "right", lineBreak: false });
    doc.text(`${(item.price||0).toFixed(2)}`,  cRate, y + 5, { width: 45, align: "right", lineBreak: false });
    doc.text(`${item.taxPercent || 0}%`,       cTaxP, y + 5, { width: 35, align: "right", lineBreak: false });
    doc.text(`${(item.taxAmount||0).toFixed(2)}`, cTaxA, y + 5, { width: 40, align: "right", lineBreak: false });
    doc.text(`${item.lineTotal.toFixed(2)}`,   cTotal - 35, y + 5, { width: 35, align: "right", lineBreak: false });
    y += ROW_H;
  });

  // Table bottom border
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.border).stroke();
  y += 12;

  // ── Totals ────────────────────────────────────────────────
  const tW    = 210;
  const tX    = M + W - tW;
  const tLblX = tX;
  const tValX = tX + 120;
  const tValW = tW - 122;

  const totRow = (label, value, isBold = false) => {
    doc.fillColor(C.gray).fontSize(8).font(isBold ? "Helvetica-Bold" : "Helvetica")
       .text(label, tLblX, y, { width: 116, align: "right", lineBreak: false });
    doc.fillColor(isBold ? C.dark : C.mid).font(isBold ? "Helvetica-Bold" : "Helvetica")
       .text(money(value), tValX, y, { width: tValW, align: "right", lineBreak: false });
    y += 13;
  };
  totRow("Subtotal",    invoice.subtotal || 0);
  if (invoice.discount > 0) totRow("Discount",  invoice.discount);
  if (invoice.taxTotal > 0) totRow("Tax (GST)", invoice.taxTotal);

  // Grand total band
  doc.rect(tX - 8, y, tW + 8, 22).fill(C.primary);
  doc.fillColor(C.white).fontSize(9.5).font("Helvetica-Bold");
  doc.text("Grand Total", tLblX - 8, y + 6, { width: 116 + 8, align: "right", lineBreak: false });
  doc.text(money(invoice.grandTotal), tValX, y + 6, { width: tValW, align: "right", lineBreak: false });
  y += 30;

  // ── Footer ───────────────────────────────────────────────
  const footY = 800;
  doc.moveTo(M, footY).lineTo(M + W, footY).lineWidth(0.5).strokeColor(C.border).stroke();
  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica");
  const note = invoice.notes ? `Note: ${invoice.notes}` : "Thank you for your business!";
  doc.text(note, M, footY + 8, { width: W / 2, lineBreak: false });
  if (invoice.terms) doc.text(`Terms & Conditions: ${invoice.terms}`, M, footY + 20, { width: W });
  doc.fillColor(C.gray).text("This is a computer generated invoice.", M + W / 2, footY + 8, { width: W / 2, align: "right", lineBreak: false });
}

// ── PDF Download ──────────────────────────────────────────────────────────────
export const downloadPDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: req.organizationId }).lean();
  if (!invoice) throw ApiError.notFound("Invoice not found");
  const org = await Organization.findById(req.organizationId).lean();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4", info: { Title: invoice.invoiceNumber, Author: org.name } });
  doc.pipe(res);
  buildPDF(doc, invoice, org);
  doc.end();
});

// ── PDF inline view (for browser preview) ────────────────────────────────────
export const viewPDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: req.organizationId }).lean();
  if (!invoice) throw ApiError.notFound("Invoice not found");
  const org = await Organization.findById(req.organizationId).lean();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4", info: { Title: invoice.invoiceNumber, Author: org.name } });
  doc.pipe(res);
  buildPDF(doc, invoice, org);
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
router.get("/:id/pdf/view",       viewPDF);
export default router;
