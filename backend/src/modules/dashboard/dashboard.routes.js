import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Sale from "../sale/sale.model.js";
import Purchase from "../purchase/purchase.model.js";
import Product from "../product/product.model.js";
import Customer from "../customer/customer.model.js";
import Supplier from "../supplier/supplier.model.js";
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";

export const getStats = asyncHandler(async (req, res) => {
  const orgId = req.organizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.setHours(0,0,0,0));

  const [
    totalProducts, lowStockProducts, totalCustomers, totalSuppliers,
    monthlySales, monthlyPurchases, todaySales, todayPurchases,
    recentSales, recentPurchases, lowStockList,
  ] = await Promise.all([
    Product.countDocuments({ organizationId: orgId }),
    Product.countDocuments({ organizationId: orgId, $expr: { $lte: ["$stock","$reorderLevel"] } }),
    Customer.countDocuments({ organizationId: orgId }),
    Supplier.countDocuments({ organizationId: orgId }),

    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
    ]),
    Purchase.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
    ]),
    Purchase.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, date: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
    ]),

    Sale.find({ organizationId: orgId }).sort({ date: -1 }).limit(5).lean(),
    Purchase.find({ organizationId: orgId }).sort({ date: -1 }).limit(5).lean(),
    Product.find({ organizationId: orgId, $expr: { $lte: ["$stock","$reorderLevel"] } })
      .populate("categoryId", "name").select("name sku stock reorderLevel unit").lean(),
  ]);

  // Monthly sales chart (last 6 months)
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1);
  const monthlySalesChart = await Sale.aggregate([
    { $match: { organizationId: orgId, isDeleted: false, date: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return ApiResponse.ok(res, "Dashboard stats", {
    kpis: {
      totalProducts,
      lowStockProducts,
      totalCustomers,
      totalSuppliers,
      monthlySales: { total: monthlySales[0]?.total || 0, count: monthlySales[0]?.count || 0 },
      monthlyPurchases: { total: monthlyPurchases[0]?.total || 0, count: monthlyPurchases[0]?.count || 0 },
      todaySales: { total: todaySales[0]?.total || 0, count: todaySales[0]?.count || 0 },
      todayPurchases: { total: todayPurchases[0]?.total || 0, count: todayPurchases[0]?.count || 0 },
    },
    recentSales,
    recentPurchases,
    lowStockList,
    monthlySalesChart,
  });
});

const router = Router();
router.use(authenticate);
router.get("/stats", getStats);
export default router;
