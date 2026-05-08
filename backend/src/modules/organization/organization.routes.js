import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import Organization from "./organization.model.js";
import User from "../user/user.model.js";
import Product from "../product/product.model.js";
import Category from "../category/category.model.js";
import Supplier from "../supplier/supplier.model.js";
import Customer from "../customer/customer.model.js";
import Purchase from "../purchase/purchase.model.js";
import Sale from "../sale/sale.model.js";
import StockAdjustment from "../stockAdjustment/stockAdjustment.model.js";
import Invoice from "../invoice/invoice.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import jwt from "jsonwebtoken";

export const getMine = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.organizationId).lean();
  if (!org) throw ApiError.notFound("Organization not found");
  return ApiResponse.ok(res, "Organization", org);
});

export const updateMine = asyncHandler(async (req, res) => {
  const allowed = ["name","storeType","currency","currencySymbol","address","phone","email","gstin","invoicePrefix","settings"];
  const raw = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  // Flatten nested objects to dot-notation so partial updates don't overwrite sibling fields
  const update = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v)) update[`${k}.${sk}`] = sv;
    } else {
      update[k] = v;
    }
  }

  const org = await Organization.findByIdAndUpdate(
    req.organizationId,
    { $set: { ...update, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
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
  const { page = 1, limit = 20, search, storeType, includeDeleted } = req.query;
  const filter = {};
  // Bypass soft-delete filter for super admin when requested
  if (includeDeleted === "true") filter.isDeleted = { $in: [true, false] };
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

// SuperAdmin — impersonate: issue a short-lived token scoped to the org
router.post("/:id/impersonate", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw ApiError.notFound("Organization not found");

  const adminUser = await User.findOne({ organizationId: req.params.id, role: "admin", isActive: true });
  const targetUserId = adminUser?._id ?? req.user._id;

  const token = jwt.sign(
    { sub: targetUserId.toString(), organizationId: req.params.id, role: "admin", impersonatedBy: req.user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return ApiResponse.ok(res, "Impersonation token issued", { token, orgName: org.name, orgId: org._id });
}));

// SuperAdmin — soft-delete org and all its data
router.delete("/:id", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw ApiError.notFound("Organization not found");

  const orgId = req.params.id;
  const now = new Date();
  const softUpdate = { $set: { isDeleted: true, deletedAt: now } };

  await Promise.all([
    Product.updateMany({ organizationId: orgId }, softUpdate),
    Category.updateMany({ organizationId: orgId }, softUpdate),
    Supplier.updateMany({ organizationId: orgId }, softUpdate),
    Customer.updateMany({ organizationId: orgId }, softUpdate),
    Purchase.updateMany({ organizationId: orgId }, softUpdate),
    Sale.updateMany({ organizationId: orgId }, softUpdate),
    StockAdjustment.updateMany({ organizationId: orgId }, softUpdate),
    Invoice.updateMany({ organizationId: orgId }, softUpdate),
    User.updateMany({ organizationId: orgId }, { $set: { isActive: false, isDeleted: true, deletedAt: now } }),
  ]);

  org.isDeleted = true;
  org.deletedAt = now;
  org.isActive = false;
  await org.save({ validateBeforeSave: false });

  return ApiResponse.ok(res, "Organization soft-deleted", { id: orgId });
}));

// SuperAdmin — force (permanent) delete org and ALL its data
router.delete("/:id/force", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const orgId = req.params.id;
  // bypass soft-delete filter
  const org = await Organization.findOne({ _id: orgId, isDeleted: { $in: [true, false] } });
  if (!org) throw ApiError.notFound("Organization not found");

  await Promise.all([
    Product.deleteMany({ organizationId: orgId }),
    Category.deleteMany({ organizationId: orgId }),
    Supplier.deleteMany({ organizationId: orgId }),
    Customer.deleteMany({ organizationId: orgId }),
    Purchase.deleteMany({ organizationId: orgId }),
    Sale.deleteMany({ organizationId: orgId }),
    StockAdjustment.deleteMany({ organizationId: orgId }),
    Invoice.deleteMany({ organizationId: orgId }),
    User.deleteMany({ organizationId: orgId }),
    Organization.deleteOne({ _id: orgId }),
  ]);

  return ApiResponse.ok(res, "Organization permanently deleted");
}));

// Store admin/staff routes
router.get("/me",   getMine);
router.patch("/me", authorize("admin", "superAdmin"), updateMine);

export default router;
