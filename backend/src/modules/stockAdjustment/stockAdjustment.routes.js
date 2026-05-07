import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import StockAdjustment from "./stockAdjustment.model.js";
import Product from "../product/product.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import mongoose from "mongoose";

export const list = asyncHandler(async (req, res) => {
  const { page, limit, productId, type, from, to } = req.query;
  const filter = { organizationId: req.organizationId };
  if (productId) filter.productId = productId;
  if (type) filter.type = type;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(new Date(to).setHours(23,59,59,999));
  }
  const result = await paginate(StockAdjustment, filter, {
    page, limit, populate: { path: "productId", select: "name sku unit" }
  });
  return ApiResponse.paginated(res, "Stock adjustments", result);
});

export const create = asyncHandler(async (req, res) => {
  const { productId, type, qty, reason } = req.body;
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest("Invalid productId");
  
  const product = await Product.findOne({ _id: productId, organizationId: req.organizationId });
  if (!product) throw ApiError.notFound("Product not found");
  
  const previousStock = product.stock;
  const newStock = type === "increase" ? previousStock + qty : previousStock - qty;
  if (newStock < 0) throw ApiError.badRequest(`Insufficient stock. Available: ${previousStock}`);

  product.stock = newStock;
  await product.save();

  const adj = await StockAdjustment.create({
    productId, productName: product.name, type, qty, reason,
    previousStock, newStock, organizationId: req.organizationId, createdBy: req.user._id,
  });
  return ApiResponse.created(res, "Stock adjusted", adj);
});

const router = Router();
router.use(authenticate);
router.get("/",   list);
router.post("/",  authorize("admin","superAdmin","staff"), create);
export default router;
