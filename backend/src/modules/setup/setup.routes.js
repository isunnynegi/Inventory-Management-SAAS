import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Router } from "express";
import User from "../user/user.model.js";
import Organization from "../organization/organization.model.js";
import Category from "../category/category.model.js";
import Product from "../product/product.model.js";
import Supplier from "../supplier/supplier.model.js";
import Customer from "../customer/customer.model.js";
import Purchase from "../purchase/purchase.model.js";
import Sale from "../sale/sale.model.js";
import StockAdjustment from "../stockAdjustment/stockAdjustment.model.js";
import Invoice from "../invoice/invoice.model.js";

const router = Router();

// Returns whether first-time setup is needed (no admin/superAdmin users exist)
router.get("/status", asyncHandler(async (_req, res) => {
  const count = await User.countDocuments({ role: { $in: ["admin", "superAdmin"] }, isActive: true });
  return ApiResponse.ok(res, "Setup status", { needsSetup: count === 0 });
}));

// Migrate all data from a cloud StockKart instance to local (Electron offline mode only)
router.post("/migrate", asyncHandler(async (req, res) => {
  if (process.env.ELECTRON_LOCAL !== "true") {
    throw ApiError.forbidden("Migration is only available in desktop offline mode");
  }

  const { cloudApiUrl, cloudEmail, cloudPassword } = req.body;
  if (!cloudApiUrl || !cloudEmail || !cloudPassword) {
    throw ApiError.badRequest("cloudApiUrl, cloudEmail, and cloudPassword are required");
  }

  // 1. Login to cloud
  const loginRes = await fetch(`${cloudApiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cloudEmail, password: cloudPassword }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.json().catch(() => ({}));
    throw ApiError.badRequest(body.message || "Cloud login failed — check your email and password");
  }
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  if (!token) throw ApiError.badRequest("No access token received from cloud");

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 2. Fetch org + current user name
  const [orgRes, meRes] = await Promise.all([
    fetch(`${cloudApiUrl}/organizations/me`, { headers: authHeaders }),
    fetch(`${cloudApiUrl}/auth/me`, { headers: authHeaders }),
  ]);
  if (!orgRes.ok) throw ApiError.badRequest("Failed to fetch organization from cloud");
  const orgData = (await orgRes.json()).data;
  const meData = (await meRes.json()).data;
  const userName = meData?.user?.name || cloudEmail.split("@")[0];

  // 3. Paginated fetch helper
  async function fetchAll(endpoint) {
    const results = [];
    let page = 1;
    while (true) {
      const r = await fetch(`${cloudApiUrl}${endpoint}?page=${page}&limit=500`, { headers: authHeaders });
      if (!r.ok) break;
      const json = await r.json();
      const items = json.data;
      if (!Array.isArray(items) || items.length === 0) break;
      results.push(...items);
      if (!json.meta || page >= json.meta.totalPages) break;
      page++;
    }
    return results;
  }

  // 4. Fetch all collections
  const [categories, products, suppliers, customers, purchases, sales, stockAdjs, invoices] = await Promise.all([
    fetchAll("/categories"),
    fetchAll("/products"),
    fetchAll("/suppliers"),
    fetchAll("/customers"),
    fetchAll("/purchases"),
    fetchAll("/sales"),
    fetchAll("/stock-adjustments"),
    fetchAll("/invoices"),
  ]);

  // 5. Import org (upsert to support retry)
  await Organization.collection.findOneAndUpdate(
    { _id: orgData._id },
    { $set: { ...orgData, isDeleted: false } },
    { upsert: true }
  );
  const counts = { organization: 1 };

  // 6. Bulk insert helper — ignores duplicate _id errors on retry
  async function bulkInsert(Model, docs, label) {
    if (!docs.length) { counts[label] = 0; return; }
    try {
      const result = await Model.collection.insertMany(docs.map(d => ({ ...d })), { ordered: false });
      counts[label] = result.insertedCount;
    } catch (e) {
      // BulkWriteError — count the successful inserts
      counts[label] = e.result?.nInserted ?? 0;
    }
  }

  await bulkInsert(Category, categories, "categories");
  await bulkInsert(Product, products, "products");
  await bulkInsert(Supplier, suppliers, "suppliers");
  await bulkInsert(Customer, customers, "customers");
  await bulkInsert(Purchase, purchases, "purchases");
  await bulkInsert(Sale, sales, "sales");
  await bulkInsert(StockAdjustment, stockAdjs, "stockAdjustments");
  await bulkInsert(Invoice, invoices, "invoices");

  // 7. Create local admin user linked to the imported org (skip if already exists)
  const existingUser = await User.findOne({ email: cloudEmail });
  if (!existingUser) {
    await User.create({
      name: userName,
      email: cloudEmail,
      password: cloudPassword, // User model pre-save hook hashes this
      organizationId: orgData._id,
      role: "admin",
      isActive: true,
    });
  }
  counts.users = 1;

  return ApiResponse.ok(res, "Migration complete", { counts, orgName: orgData.name });
}));

export default router;
