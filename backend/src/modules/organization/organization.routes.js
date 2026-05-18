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
import mongoose from "mongoose";

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
    // Customer.updateMany({ organizationId: orgId }, softUpdate),
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
    // Customer.deleteMany({ organizationId: orgId }),
    Purchase.deleteMany({ organizationId: orgId }),
    Sale.deleteMany({ organizationId: orgId }),
    StockAdjustment.deleteMany({ organizationId: orgId }),
    Invoice.deleteMany({ organizationId: orgId }),
    User.deleteMany({ organizationId: orgId }),
    Organization.deleteOne({ _id: orgId }),
  ]);

  return ApiResponse.ok(res, "Organization permanently deleted");
}));

// SuperAdmin — store-level report
router.get("/:id/report", authorize("superAdmin"), asyncHandler(async (req, res) => {
  const rawId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(rawId)) throw ApiError.badRequest("Invalid organization id");
  const orgId = new mongoose.Types.ObjectId(rawId);

  const org = await Organization.findOne({ _id: orgId }).lean();
  if (!org) throw ApiError.notFound("Organization not found");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalProducts, lowStockProducts, totalCategories, totalCustomers, totalSuppliers,
    monthlySales, monthlyPurchases, todaySales, todayPurchases,
    recentSales, recentPurchases, lowStockList,
    monthlySalesChart,
    lastSale, lastPurchase, lastStockAdj,
    totalSalesAllTime,
  ] = await Promise.all([
    Product.countDocuments({ organizationId: orgId }),
    Product.countDocuments({ organizationId: orgId, $expr: { $lte: ["$stock", "$reorderLevel"] } }),
    Category.countDocuments({ organizationId: orgId }),
    Customer.countDocuments({ organizationId: orgId }),
    Supplier.countDocuments({ organizationId: orgId }),

    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),

    Sale.find({ organizationId: orgId, isDeleted: false }).sort({ date: -1 }).limit(5).lean(),
    Purchase.find({ organizationId: orgId, isDeleted: false }).sort({ date: -1 }).limit(5).lean(),
    Product.find({ organizationId: orgId, $expr: { $lte: ["$stock", "$reorderLevel"] } })
      .populate("categoryId", "name").select("name sku stock reorderLevel unit").limit(10).lean(),

    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    Sale.findOne({ organizationId: orgId, isDeleted: false }).sort({ date: -1 }).select("date").lean(),
    Purchase.findOne({ organizationId: orgId, isDeleted: false }).sort({ date: -1 }).select("date").lean(),
    StockAdjustment.findOne({ organizationId: orgId, isDeleted: false }).sort({ createdAt: -1 }).select("createdAt").lean(),

    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const activityDates = [
    lastSale?.date, lastPurchase?.date, lastStockAdj?.createdAt,
  ].filter(Boolean);
  const lastActivity = activityDates.length > 0 ? new Date(Math.max(...activityDates.map(d => new Date(d).getTime()))) : null;

  return ApiResponse.ok(res, "Store report", {
    organization: org,
    kpis: {
      totalProducts,
      lowStockProducts,
      totalCategories,
      totalCustomers,
      totalSuppliers,
      monthlySales: { total: monthlySales[0]?.total || 0, count: monthlySales[0]?.count || 0 },
      monthlyPurchases: { total: monthlyPurchases[0]?.total || 0, count: monthlyPurchases[0]?.count || 0 },
      todaySales: { total: todaySales[0]?.total || 0, count: todaySales[0]?.count || 0 },
      todayPurchases: { total: todayPurchases[0]?.total || 0, count: todayPurchases[0]?.count || 0 },
      totalSalesAllTime: { total: totalSalesAllTime[0]?.total || 0, count: totalSalesAllTime[0]?.count || 0 },
    },
    lastActivity,
    recentSales,
    recentPurchases,
    lowStockList,
    monthlySalesChart,
  });
}));

// Store admin/staff routes
router.get("/me",   getMine);
router.patch("/me", authorize("admin", "superAdmin"), updateMine);
router.patch("/me/storefront", authorize("admin", "superAdmin"), asyncHandler(async (req, res) => {
  const allowed = ["enabled", "paymentMethods", "deliveryEnabled", "pickupEnabled", "deliveryCharge", "freeDeliveryAbove", "upiId", "upiName", "juspay", "branding"];
  const update = {};
  for (const [k, v] of Object.entries(req.body)) {
    if (!allowed.includes(k)) continue;
    if (k === "juspay" && typeof v === "object") {
      for (const [jk, jv] of Object.entries(v)) update[`storefront.juspay.${jk}`] = jv;
    } else if (k === "branding" && typeof v === "object") {
      for (const [bk, bv] of Object.entries(v)) update[`storefront.branding.${bk}`] = bv;
    } else {
      update[`storefront.${k}`] = v;
    }
  }
  const org = await Organization.findByIdAndUpdate(
    req.organizationId,
    { $set: { ...update, updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!org) throw ApiError.notFound("Organization not found");
  return ApiResponse.ok(res, "Storefront settings updated", org.storefront);
}));

export default router;
