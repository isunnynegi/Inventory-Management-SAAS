import StorefrontOrder from "./storefrontOrder.model.js";
import Product from "../product/product.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const listOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, fulfillmentType, search, page = 1, limit = 20 } = req.query;
  const filter = { organizationId: req.organizationId };

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (fulfillmentType) filter.fulfillmentType = fulfillmentType;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    StorefrontOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    StorefrontOrder.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, "Orders", {
    docs: orders, totalDocs: total, limit: Number(limit),
    page: Number(page), totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await StorefrontOrder.findOne({ _id: req.params.id, organizationId: req.organizationId }).lean();
  if (!order) throw ApiError.notFound("Order not found");
  return ApiResponse.ok(res, "Order", order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, cancelReason } = req.body;
  const allowed = ["pending", "confirmed", "processing", "ready", "out_for_delivery", "delivered", "cancelled"];
  if (!allowed.includes(status)) throw ApiError.badRequest("Invalid status");

  const order = await StorefrontOrder.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!order) throw ApiError.notFound("Order not found");

  if (status === "cancelled" && order.status !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
    }
    if (cancelReason) order.cancelReason = cancelReason;
  }

  order.status = status;
  order.statusHistory.push({ status, note: note || "" });
  await order.save();

  return ApiResponse.ok(res, "Order updated", order);
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentStatus, note } = req.body;
  const allowed = ["pending", "paid", "failed", "refunded"];
  if (!allowed.includes(paymentStatus)) throw ApiError.badRequest("Invalid payment status");

  const order = await StorefrontOrder.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!order) throw ApiError.notFound("Order not found");

  order.paymentStatus = paymentStatus;
  if (paymentStatus === "paid") {
    order.paidAt = new Date();
    if (order.status === "pending") {
      order.status = "confirmed";
      order.statusHistory.push({ status: "confirmed", note: note || "Payment confirmed by admin" });
    }
  }
  await order.save();

  return ApiResponse.ok(res, "Payment status updated", order);
});

export const getOrderStats = asyncHandler(async (req, res) => {
  const orgId = req.organizationId;
  const [total, pending, active, delivered, cancelled, revenue] = await Promise.all([
    StorefrontOrder.countDocuments({ organizationId: orgId }),
    StorefrontOrder.countDocuments({ organizationId: orgId, status: "pending" }),
    StorefrontOrder.countDocuments({ organizationId: orgId, status: { $in: ["confirmed", "processing", "ready", "out_for_delivery"] } }),
    StorefrontOrder.countDocuments({ organizationId: orgId, status: "delivered" }),
    StorefrontOrder.countDocuments({ organizationId: orgId, status: "cancelled" }),
    StorefrontOrder.aggregate([
      { $match: { organizationId: orgId, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  return ApiResponse.ok(res, "Stats", {
    total, pending, active, delivered, cancelled,
    revenue: revenue[0]?.total || 0,
  });
});
