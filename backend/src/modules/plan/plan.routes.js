import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import Plan from "./plan.model.js";

// Public — pricing page
export const listPlans = asyncHandler(async (_req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  return ApiResponse.ok(res, "Plans", plans);
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id).lean();
  if (!plan) throw ApiError.notFound("Plan not found");
  return ApiResponse.ok(res, "Plan", plan);
});

// SuperAdmin management
export const createPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  return ApiResponse.created(res, "Plan created", plan);
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!plan) throw ApiError.notFound("Plan not found");
  return ApiResponse.ok(res, "Plan updated", plan);
});

const router = Router();
router.get("/", listPlans);
router.get("/:id", getPlan);
router.use(authenticate);
router.post("/", authorize("superAdmin"), createPlan);
router.patch("/:id", authorize("superAdmin"), updatePlan);

export default router;
