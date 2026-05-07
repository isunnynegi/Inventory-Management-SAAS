import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import Organization from "./organization.model.js";
import User from "../user/user.model.js";
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

// Public — returns enum values directly from the schema so the frontend stays in sync
router.get("/store-types", (_req, res) => {
  const values = Organization.schema.path("storeType").enumValues;
  return ApiResponse.ok(res, "Store types", values);
});

router.use(authenticate);

// SuperAdmin — platform-wide stats
router.get("/platform-stats", authorize("superAdmin"), asyncHandler(async (_req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalOrgs, activeOrgs, newThisMonth, totalUsers, recentOrgs] = await Promise.all([
    Organization.countDocuments({}),
    Organization.countDocuments({ isActive: true }),
    Organization.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({}),
    Organization.find({}).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return ApiResponse.ok(res, "Platform stats", {
    totalOrgs,
    activeOrgs,
    inactiveOrgs: totalOrgs - activeOrgs,
    newThisMonth,
    totalUsers,
    recentOrgs,
  });
}));

// SuperAdmin — list all organizations
router.get("/", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, storeType } = req.query;
  const filter = {};
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  if (storeType) filter.storeType = storeType;

  const [orgs, total] = await Promise.all([
    Organization.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
    Organization.countDocuments(filter),
  ]);

  return ApiResponse.ok(res, "Organizations", orgs, {
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
}));

// SuperAdmin — toggle org active status
router.patch("/:id/status", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: req.body.isActive } },
    { new: true }
  );
  if (!org) throw ApiError.notFound("Organization not found");
  return ApiResponse.ok(res, "Organization status updated", org);
}));

// Store admin/staff routes
router.get("/me",   getMine);
router.patch("/me", authorize("admin", "superAdmin"), updateMine);

export default router;
