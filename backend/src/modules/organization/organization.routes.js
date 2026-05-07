import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import Organization from "./organization.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

export const getMine = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.organizationId).lean();
  if (!org) throw ApiError.notFound("Organization not found");
  return ApiResponse.ok(res, "Organization", org);
});

export const updateMine = asyncHandler(async (req, res) => {
  const allowed = ["name","storeType","currency","currencySymbol","address","phone","email","gstin","invoicePrefix","settings"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const org = await Organization.findByIdAndUpdate(req.organizationId, { $set: { ...update, updatedBy: req.user._id } }, { new: true, runValidators: true });
  if (!org) throw ApiError.notFound("Organization not found");
  return ApiResponse.ok(res, "Organization updated", org);
});

const router = Router();
router.use(authenticate);
router.get("/me",    getMine);
router.patch("/me",  authorize("admin","superAdmin"), updateMine);
export default router;
