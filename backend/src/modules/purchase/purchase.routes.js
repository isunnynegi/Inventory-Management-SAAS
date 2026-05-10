import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Purchase from "./purchase.model.js";
import Product from "../product/product.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import mongoose from "mongoose";

export const list = asyncHandler(async (req, res) => {
  const { page, limit, supplierId, paymentStatus, from, to, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (supplierId) filter.supplierId = supplierId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) filter.$or = [
    { purchaseNumber: { $regex: search, $options: "i" } },
    { supplierName: { $regex: search, $options: "i" } },
  ];
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(new Date(to).setHours(23,59,59,999));
  }
  const result = await paginate(Purchase, filter, {
    page, limit, populate: { path: "supplierId", select: "name phone" }
  });
  return ApiResponse.paginated(res, "Purchases", result);
});

export const create = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { supplierId, supplierName, items, subtotal, taxTotal, discount, totalAmount, amountPaid, paymentMethod, paymentStatus, date, notes, reference } = req.body;
    if (!items?.length) throw ApiError.badRequest("Items are required");

    // Build items with product snapshots + update stock
    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, organizationId: req.organizationId }).session(session);
      if (!product) throw ApiError.notFound(`Product ${item.productId} not found`);
      product.stock += Number(item.qty);
      product.purchasePrice = Number(item.costPrice);
      await product.save({ session });
      enrichedItems.push({
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        unit: product.unit,
        costPrice: item.costPrice,
        taxPercent: item.taxPercent || 0,
        taxAmount: item.taxAmount || 0,
        lineTotal: item.lineTotal,
      });
    }

    // Auto-generate purchase number
    const count = await Purchase.countDocuments({ organizationId: req.organizationId }).session(session);
    const purchaseNumber = `PO-${String(count + 1).padStart(5, "0")}`;
    const ps = amountPaid >= totalAmount ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

    const [purchase] = await Purchase.create([{
      purchaseNumber, supplierId, supplierName, items: enrichedItems,
      subtotal, taxTotal, discount, totalAmount, amountPaid,
      paymentMethod, paymentStatus: paymentStatus || ps,
      date, notes, reference, organizationId: req.organizationId, createdBy: req.user._id,
    }], { session });

    await session.commitTransaction();
    return ApiResponse.created(res, "Purchase recorded", purchase);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const getOne = asyncHandler(async (req, res) => {
  const doc = await Purchase.findOne({ _id: req.params.id, organizationId: req.organizationId })
    .populate("supplierId", "name phone email address");
  if (!doc) throw ApiError.notFound("Purchase not found");
  return ApiResponse.ok(res, "Purchase", doc);
});

export const remove = asyncHandler(async (req, res) => {
  const doc = await Purchase.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Purchase not found");
  // Reverse stock
  for (const item of doc.items) {
    await Product.findOneAndUpdate(
      { _id: item.productId, organizationId: req.organizationId },
      { $inc: { stock: -item.qty } }
    );
  }
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Purchase deleted and stock reversed");
});

import { requireFeature } from "../../middleware/featureGate.js";

const router = Router();
router.use(authenticate);
router.use(requireFeature("purchase"));
router.get("/",    list);
router.post("/",   authorize("admin","superAdmin","staff"), create);
router.get("/:id", getOne);
router.delete("/:id", authorize("admin","superAdmin"), remove);
export default router;
