import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Sale from "../sale/sale.model.js";
import Purchase from "../purchase/purchase.model.js";
import Product from "../product/product.model.js";
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";

const dateFilter = (from, to) => {
  if (!from && !to) return undefined;
  const f = {};
  if (from) f.$gte = new Date(from);
  if (to) f.$lte = new Date(new Date(to).setHours(23,59,59,999));
  return f;
};

export const salesReport = asyncHandler(async (req, res) => {
  const { from, to, groupBy = "day" } = req.query;
  const orgId = req.organizationId;
  const df = dateFilter(from, to);
  const match = { organizationId: orgId, isDeleted: false };
  if (df) match.date = df;

  const groupFormats = {
    day:   { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" } },
    month: { year: { $year: "$date" }, month: { $month: "$date" } },
    year:  { year: { $year: "$date" } },
  };

  const [summary, chart, topProducts] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalTax: { $sum: "$taxTotal" }, totalDiscount: { $sum: "$discount" }, count: { $sum: 1 }, avgOrder: { $avg: "$totalAmount" } } }
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: groupFormats[groupBy] || groupFormats.day, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", name: { $first: "$items.productName" }, totalQty: { $sum: "$items.qty" }, totalRevenue: { $sum: "$items.lineTotal" } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]),
  ]);

  return ApiResponse.ok(res, "Sales report", { summary: summary[0] || {}, chart, topProducts });
});

export const purchaseReport = asyncHandler(async (req, res) => {
  const { from, to, groupBy = "day" } = req.query;
  const orgId = req.organizationId;
  const df = dateFilter(from, to);
  const match = { organizationId: orgId, isDeleted: false };
  if (df) match.date = df;

  const groupFormats = {
    day:   { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" } },
    month: { year: { $year: "$date" }, month: { $month: "$date" } },
    year:  { year: { $year: "$date" } },
  };

  const [summary, chart, topSuppliers] = await Promise.all([
    Purchase.aggregate([
      { $match: match },
      { $group: { _id: null, totalCost: { $sum: "$totalAmount" }, count: { $sum: 1 }, avgOrder: { $avg: "$totalAmount" } } }
    ]),
    Purchase.aggregate([
      { $match: match },
      { $group: { _id: groupFormats[groupBy] || groupFormats.day, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]),
    Purchase.aggregate([
      { $match: match },
      { $group: { _id: "$supplierId", name: { $first: "$supplierName" }, totalAmount: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]),
  ]);

  return ApiResponse.ok(res, "Purchase report", { summary: summary[0] || {}, chart, topSuppliers });
});

export const stockReport = asyncHandler(async (req, res) => {
  const { categoryId, lowStock } = req.query;
  const orgId = req.organizationId;
  const match = { organizationId: orgId };
  if (categoryId) match.categoryId = new (await import("mongoose")).default.Types.ObjectId(categoryId);
  if (lowStock === "true") match.$expr = { $lte: ["$stock", "$reorderLevel"] };

  const products = await Product.find(match)
    .populate("categoryId", "name")
    .select("name sku unit stock reorderLevel purchasePrice sellingPrice")
    .lean();

  const totalValue = products.reduce((acc, p) => acc + p.stock * p.purchasePrice, 0);
  const totalSaleValue = products.reduce((acc, p) => acc + p.stock * p.sellingPrice, 0);
  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;

  return ApiResponse.ok(res, "Stock report", { products, totalValue, totalSaleValue, lowStockCount, totalProducts: products.length });
});

export const profitReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const orgId = req.organizationId;
  const df = dateFilter(from, to);
  const match = { organizationId: orgId, isDeleted: false };
  if (df) match.date = df;

  const [salesData, purchaseData] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, taxCollected: { $sum: "$taxTotal" } } }
    ]),
    Purchase.aggregate([
      { $match: match },
      { $group: { _id: null, cost: { $sum: "$totalAmount" } } }
    ]),
  ]);

  const revenue = salesData[0]?.revenue || 0;
  const cost = purchaseData[0]?.cost || 0;
  const profit = revenue - cost;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

  return ApiResponse.ok(res, "Profit report", { revenue, cost, profit, margin: Number(margin) });
});

import { requireFeature } from "../../middleware/featureGate.js";

const router = Router();
router.use(authenticate);
router.use(requireFeature("data_export"));
router.get("/sales",    salesReport);
router.get("/purchases", purchaseReport);
router.get("/stock",    stockReport);
router.get("/profit",   profitReport);
export default router;
