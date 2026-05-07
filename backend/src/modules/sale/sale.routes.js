import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Sale from "./sale.model.js";
import Product from "../product/product.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import mongoose from "mongoose";

export const list = asyncHandler(async (req, res) => {
  const { page, limit, customerId, paymentStatus, from, to, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (customerId) filter.customerId = customerId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) filter.$or = [
    { saleNumber: { $regex: search, $options: "i" } },
    { customerName: { $regex: search, $options: "i" } },
  ];
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(new Date(to).setHours(23,59,59,999));
  }
  const result = await paginate(Sale, filter, {
    page, limit, populate: { path: "customerId", select: "name phone" }
  });
  return ApiResponse.paginated(res, "Sales", result);
});

export const create = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customerId, customerName, items, subtotal, taxTotal, discount, totalAmount, amountPaid, paymentMethod, paymentStatus, date, notes } = req.body;
    if (!items?.length) throw ApiError.badRequest("Items are required");

    // Validate & deduct stock
    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, organizationId: req.organizationId }).session(session);
      if (!product) throw ApiError.notFound(`Product ${item.productId} not found`);
      if (product.stock < item.qty) throw ApiError.badRequest(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
      product.stock -= Number(item.qty);
      await product.save({ session });
      enrichedItems.push({
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        unit: product.unit,
        sellingPrice: item.sellingPrice,
        taxPercent: item.taxPercent || 0,
        taxAmount: item.taxAmount || 0,
        lineTotal: item.lineTotal,
      });
    }

    const count = await Sale.countDocuments({ organizationId: req.organizationId }).session(session);
    const saleNumber = `SALE-${String(count + 1).padStart(5, "0")}`;
    const ps = amountPaid >= totalAmount ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

    const [sale] = await Sale.create([{
      saleNumber, customerId, customerName, items: enrichedItems,
      subtotal, taxTotal, discount, totalAmount, amountPaid,
      paymentMethod, paymentStatus: paymentStatus || ps,
      date, notes, organizationId: req.organizationId, createdBy: req.user._id,
    }], { session });

    await session.commitTransaction();
    return ApiResponse.created(res, "Sale recorded", sale);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

export const getOne = asyncHandler(async (req, res) => {
  const doc = await Sale.findOne({ _id: req.params.id, organizationId: req.organizationId })
    .populate("customerId", "name phone email address");
  if (!doc) throw ApiError.notFound("Sale not found");
  return ApiResponse.ok(res, "Sale", doc);
});

export const remove = asyncHandler(async (req, res) => {
  const doc = await Sale.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Sale not found");
  // Restore stock
  for (const item of doc.items) {
    await Product.findOneAndUpdate(
      { _id: item.productId, organizationId: req.organizationId },
      { $inc: { stock: item.qty } }
    );
  }
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Sale deleted and stock restored");
});

const router = Router();
router.use(authenticate);
router.get("/",    list);
router.post("/",   authorize("admin","superAdmin","staff"), create);
router.get("/:id", getOne);
router.delete("/:id", authorize("admin","superAdmin"), remove);
export default router;
