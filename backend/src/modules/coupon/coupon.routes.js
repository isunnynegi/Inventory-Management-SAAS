import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import Coupon from "./coupon.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.use(authenticate, authorize("admin", "superAdmin"));

router.get("/", asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({ organizationId: req.organizationId })
    .sort({ createdAt: -1 })
    .lean();
  return ApiResponse.ok(res, "Coupons", coupons);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { code, type, value, minOrderAmount, maxUses, expiresAt } = req.body;
  if (!code || !type || value == null) throw ApiError.badRequest("code, type, and value are required");

  const existing = await Coupon.findOne({ organizationId: req.organizationId, code: code.toUpperCase().trim() });
  if (existing) throw ApiError.conflict("Coupon code already exists");

  const coupon = await Coupon.create({
    organizationId: req.organizationId,
    code: code.toUpperCase().trim(),
    type,
    value,
    minOrderAmount: minOrderAmount || 0,
    maxUses: maxUses || 0,
    expiresAt: expiresAt || undefined,
    createdBy: req.user._id,
  });
  return ApiResponse.created(res, "Coupon created", coupon);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { type, value, minOrderAmount, maxUses, expiresAt, isActive } = req.body;
  const coupon = await Coupon.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { $set: { type, value, minOrderAmount, maxUses, expiresAt, isActive, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!coupon) throw ApiError.notFound("Coupon not found");
  return ApiResponse.ok(res, "Coupon updated", coupon);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
  if (!coupon) throw ApiError.notFound("Coupon not found");
  return ApiResponse.ok(res, "Coupon deleted");
}));

export default router;
