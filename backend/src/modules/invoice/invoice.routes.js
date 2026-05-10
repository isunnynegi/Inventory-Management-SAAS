import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Invoice from "./invoice.model.js";
import Sale from "../sale/sale.model.js";
import Product from "../product/product.model.js";
import Organization from "../organization/organization.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import PDFDocument from "pdfkit";
import { genInvoiceNumber, buildPDF } from "../../utils/invoicePdf.js";


// Generate invoice from sale
export const fromSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.saleId, organizationId: req.organizationId });
  if (!sale) throw ApiError.notFound("Sale not found");
  const existing = await Invoice.findOne({ saleId: sale._id }).lean();
  if (existing) throw ApiError.conflict("Invoice already exists for this sale");

  const org = await Organization.findById(req.organizationId);
  const invoiceNumber = await genInvoiceNumber(org);

  // Fetch products to get SKU and HSN from attributes
  const pids = sale.items.map(i => i.productId).filter(Boolean);
  const products = pids.length
    ? await Product.find({ _id: { $in: pids } }).lean()
    : [];
  const prodMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));
  const getAttr = (p, key) => p?.attributes?.find(a => a.key === key)?.value || "";

  const items = sale.items.map(i => {
    const p = prodMap[i.productId?.toString()] || {};
    return {
      productId: i.productId, name: i.productName,
      sku: p.sku || "", hsn: getAttr(p, "hsn"),
      qty: i.qty, unit: i.unit,
      price: i.sellingPrice, taxPercent: i.taxPercent,
      taxAmount: i.taxAmount, lineTotal: i.lineTotal,
    };
  });

  const invoice = await Invoice.create({
    invoiceNumber, saleId: sale._id,
    customerId: sale.customerId, customerName: sale.customerName,
    placeOfSupply: org.address?.state || "",
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
