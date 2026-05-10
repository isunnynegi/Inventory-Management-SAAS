import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import Organization from "../organization/organization.model.js";
import Product from "../product/product.model.js";
import Category from "../category/category.model.js";
import StorefrontCustomer from "./storefrontCustomer.model.js";
import StorefrontOrder from "../storefrontOrder/storefrontOrder.model.js";
import Invoice from "../invoice/invoice.model.js";
import Coupon from "../coupon/coupon.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { createJuspayOrder } from "../../utils/juspay.js";
import { genInvoiceNumber, buildPDF } from "../../utils/invoicePdf.js";
import logger from "../../utils/logger.js";

const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
const CUSTOMER_REFRESH_SECRET = process.env.CUSTOMER_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;

function signCustomerToken(customerId) {
  return jwt.sign({ sub: customerId, type: "storefront_customer" }, CUSTOMER_JWT_SECRET, { expiresIn: "7d" });
}
function signCustomerRefresh(customerId) {
  return jwt.sign({ sub: customerId, type: "storefront_customer" }, CUSTOMER_REFRESH_SECRET, { expiresIn: "30d" });
}

async function resolveOrg(slug) {
  const org = await Organization.findOne({ slug, isActive: true }).lean();
  if (!org) throw ApiError.notFound("Store not found");
  if (!org.storefront?.enabled) throw ApiError.notFound("Store not found");
  return org;
}

// ── Public store info ─────────────────────────────────────────────────────────
export const getStoreInfo = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  return ApiResponse.ok(res, "Store info", {
    id: org._id,
    name: org.storeName || org.name,
    slug: org.slug,
    storeType: org.storeType,
    logo: org.logo,
    address: org.address,
    phone: org.phone,
    email: org.email,
    currencySymbol: org.currencySymbol || "₹",
    paymentMethods: org.storefront.paymentMethods || ["cash"],
    deliveryEnabled: org.storefront.deliveryEnabled,
    pickupEnabled: org.storefront.pickupEnabled,
    deliveryCharge: org.storefront.deliveryCharge || 0,
    freeDeliveryAbove: org.storefront.freeDeliveryAbove || 0,
    upiId: org.storefront.upiId,
    upiName: org.storefront.upiName,
    juspayEnabled: !!(org.storefront.juspay?.enabled && org.storefront.juspay?.merchantId),
    branding: org.storefront.branding || {},
  });
});

// ── Homepage data ─────────────────────────────────────────────────────────────
export const getHomepage = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);

  const [categories, featured, popular] = await Promise.all([
    Category.find({ organizationId: org._id, parent: null })
      .select("name image description")
      .sort("name")
      .limit(12)
      .lean(),
    Product.find({ organizationId: org._id, isActive: true, isFeatured: true, stock: { $gt: 0 } })
      .select("name image sellingPrice taxPercent stock categoryId isFeatured soldCount")
      .populate("categoryId", "name")
      .limit(12)
      .lean(),
    Product.find({ organizationId: org._id, isActive: true, stock: { $gt: 0 } })
      .select("name image sellingPrice taxPercent stock categoryId soldCount")
      .populate("categoryId", "name")
      .sort({ soldCount: -1 })
      .limit(12)
      .lean(),
  ]);

  return ApiResponse.ok(res, "Homepage data", {
    branding: org.storefront.branding || {},
    categories,
    featuredProducts: featured,
    popularProducts: popular,
  });
});

// ── Coupon validation ─────────────────────────────────────────────────────────
export const validateCoupon = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { code, subtotal } = req.query;

  if (!code) throw ApiError.badRequest("Coupon code is required");
  const orderAmount = Number(subtotal) || 0;

  const coupon = await Coupon.findOne({
    organizationId: org._id,
    code: code.toUpperCase().trim(),
    isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      { $or: [{ maxUses: 0 }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
    ],
  }).lean();

  if (!coupon) throw ApiError.badRequest("Invalid or expired coupon code");
  if (coupon.minOrderAmount > 0 && orderAmount < coupon.minOrderAmount) {
    throw ApiError.badRequest(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  const discount = coupon.type === "percent"
    ? Number(((orderAmount * coupon.value) / 100).toFixed(2))
    : Math.min(coupon.value, orderAmount);

  return ApiResponse.ok(res, "Coupon valid", {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
  });
});

// ── Products ──────────────────────────────────────────────────────────────────
export const listProducts = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { search, categoryId, brand, minPrice, maxPrice, inStock, page = 1, limit = 24 } = req.query;

  const filter = { organizationId: org._id, isActive: true };
  if (inStock !== "false") filter.stock = { $gt: 0 };
  if (search) filter.name = { $regex: search, $options: "i" };
  if (categoryId) filter.categoryId = categoryId;
  if (brand) filter.attributes = { $elemMatch: { key: "brand", value: { $regex: `^${brand}$`, $options: "i" } } };
  if (minPrice || maxPrice) {
    filter.sellingPrice = {};
    if (minPrice) filter.sellingPrice.$gte = Number(minPrice);
    if (maxPrice) filter.sellingPrice.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("name sku image sellingPrice taxPercent unit stock categoryId attributes description")
      .populate("categoryId", "name")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, "Products", {
    docs: products, totalDocs: total, limit: Number(limit),
    page: Number(page), totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const products = await Product.find({ organizationId: org._id, isActive: true })
    .select("attributes sellingPrice")
    .lean();

  const brandSet = new Set();
  for (const p of products) {
    const b = p.attributes?.find(a => a.key === "brand");
    if (b?.value) brandSet.add(b.value);
  }

  const prices = products.map(p => p.sellingPrice).filter(n => n > 0);

  return ApiResponse.success(res, "Filter options", {
    brands: [...brandSet].sort(),
    priceRange: {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 10000,
    },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const product = await Product.findOne({ _id: req.params.productId, organizationId: org._id, isActive: true })
    .populate("categoryId", "name")
    .lean();
  if (!product) throw ApiError.notFound("Product not found");
  return ApiResponse.ok(res, "Product", product);
});

// ── Categories ────────────────────────────────────────────────────────────────
export const listCategories = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const categories = await Category.find({ organizationId: org._id, parent: null })
    .select("name description image")
    .sort("name")
    .lean();
  return ApiResponse.ok(res, "Categories", categories);
});

// ── Customer Auth ─────────────────────────────────────────────────────────────
export const customerRegister = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { name, email, password, phone } = req.body;

  const existing = await StorefrontCustomer.findOne({ email });
  if (existing) throw ApiError.conflict("Email already registered");

  // Store organizationId as first-registered store (informational)
  const customer = await StorefrontCustomer.create({ organizationId: org._id, name, email, password, phone });
  const accessToken = signCustomerToken(customer._id);
  const refresh = signCustomerRefresh(customer._id);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await StorefrontCustomer.findByIdAndUpdate(customer._id, {
    $push: { refreshTokens: { token: refresh, expiresAt: expires } },
  });

  res.cookie("sf_refresh", refresh, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires,
  });
  return ApiResponse.created(res, "Account created", {
    customer: { _id: customer._id, name: customer.name, email: customer.email },
    accessToken,
  });
});

export const customerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Global lookup — same account works across all stores
  const customer = await StorefrontCustomer.findOne({ email }).select("+password");
  if (!customer || !(await customer.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!customer.isActive) throw ApiError.forbidden("Account deactivated");

  const accessToken = signCustomerToken(customer._id);
  const refresh = signCustomerRefresh(customer._id);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await StorefrontCustomer.findByIdAndUpdate(customer._id, {
    $push: { refreshTokens: { token: refresh, expiresAt: expires } },
  });

  res.cookie("sf_refresh", refresh, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires,
  });
  return ApiResponse.ok(res, "Login successful", {
    customer: { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone, addresses: customer.addresses },
    accessToken,
  });
});

export const customerLogout = asyncHandler(async (req, res) => {
  const token = req.cookies.sf_refresh;
  if (token) {
    await StorefrontCustomer.findByIdAndUpdate(req.storefrontCustomer._id, {
      $pull: { refreshTokens: { token } },
    });
  }
  res.clearCookie("sf_refresh");
  return ApiResponse.ok(res, "Logged out");
});

export const customerRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.sf_refresh;
  if (!token) throw ApiError.unauthorized("No refresh token");

  let decoded;
  try { decoded = jwt.verify(token, CUSTOMER_REFRESH_SECRET); }
  catch { throw ApiError.unauthorized("Invalid or expired refresh token"); }

  const customer = await StorefrontCustomer.findById(decoded.sub).select("+refreshTokens");
  if (!customer) throw ApiError.unauthorized("Customer not found");

  const stored = customer.refreshTokens.find(t => t.token === token && t.expiresAt > new Date());
  if (!stored) throw ApiError.unauthorized("Refresh token revoked");

  customer.refreshTokens = customer.refreshTokens.filter(t => t.token !== token);
  const newRefresh = signCustomerRefresh(customer._id);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  customer.refreshTokens.push({ token: newRefresh, expiresAt: expires });
  await customer.save({ validateBeforeSave: false });

  const accessToken = signCustomerToken(customer._id);
  res.cookie("sf_refresh", newRefresh, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires,
  });
  return ApiResponse.ok(res, "Token refreshed", { accessToken });
});

export const getCustomerMe = asyncHandler(async (req, res) => {
  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id).lean();
  if (!customer) throw ApiError.notFound("Customer not found");
  return ApiResponse.ok(res, "Profile", {
    _id: customer._id, name: customer.name, email: customer.email,
    phone: customer.phone, addresses: customer.addresses,
  });
});

export const updateCustomerProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const customer = await StorefrontCustomer.findByIdAndUpdate(
    req.storefrontCustomer._id,
    { name, phone },
    { new: true, runValidators: true }
  ).lean();
  return ApiResponse.ok(res, "Profile updated", {
    _id: customer._id, name: customer.name, email: customer.email,
    phone: customer.phone, addresses: customer.addresses,
  });
});

export const addAddress = asyncHandler(async (req, res) => {
  const { label, name, phone, street, city, state, zip, isDefault } = req.body;
  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id);
  if (isDefault) customer.addresses.forEach(a => { a.isDefault = false; });
  customer.addresses.push({ label: label || "Home", name, phone, street, city, state, zip, isDefault: !!isDefault });
  await customer.save();
  return ApiResponse.ok(res, "Address added", customer.addresses);
});

export const removeAddress = asyncHandler(async (req, res) => {
  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id);
  customer.addresses = customer.addresses.filter(a => a._id.toString() !== req.params.addressId);
  await customer.save();
  return ApiResponse.ok(res, "Address removed", customer.addresses);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id);
  customer.addresses.forEach(a => {
    a.isDefault = a._id.toString() === req.params.addressId;
  });
  await customer.save();
  return ApiResponse.ok(res, "Primary address updated", customer.addresses);
});

// ── Orders ────────────────────────────────────────────────────────────────────
let _orderCounter = Math.floor(Math.random() * 1000);

function generateOrderNumber(orgSlug) {
  _orderCounter = (_orderCounter + 1) % 100000;
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const n = String(_orderCounter).padStart(4, "0");
  return `${orgSlug.toUpperCase().slice(0, 4)}-${ts}${n}`;
}

export const createOrder = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { items, fulfillmentType, deliveryAddress, paymentMethod, notes, couponCode } = req.body;

  if (!org.storefront.paymentMethods.includes(paymentMethod)) {
    throw ApiError.badRequest("Payment method not supported by this store");
  }
  if (fulfillmentType === "delivery" && !org.storefront.deliveryEnabled) {
    throw ApiError.badRequest("Delivery not available");
  }
  if (fulfillmentType === "pickup" && !org.storefront.pickupEnabled) {
    throw ApiError.badRequest("Pickup not available");
  }
  if (fulfillmentType === "delivery" && !deliveryAddress?.street) {
    throw ApiError.badRequest("Delivery address is required");
  }

  const productIds = items.map(i => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, organizationId: org._id, isActive: true }).lean();
  const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

  let subtotal = 0, taxTotal = 0;
  const orderItems = [];
  for (const item of items) {
    const p = productMap[item.productId];
    if (!p) throw ApiError.badRequest(`Product not found or unavailable`);
    if (p.stock < item.qty) throw ApiError.badRequest(`Insufficient stock for "${p.name}"`);
    const lineTotal = p.sellingPrice * item.qty;
    const taxAmount = Number((lineTotal * (p.taxPercent / 100)).toFixed(2));
    subtotal += lineTotal;
    taxTotal += taxAmount;
    orderItems.push({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      image: p.image,
      qty: item.qty,
      unitPrice: p.sellingPrice,
      taxPercent: p.taxPercent,
      taxAmount,
      lineTotal,
    });
  }

  const deliveryCharge = (fulfillmentType === "delivery")
    ? (org.storefront.freeDeliveryAbove > 0 && subtotal >= org.storefront.freeDeliveryAbove
        ? 0
        : (org.storefront.deliveryCharge || 0))
    : 0;

  // Atomic coupon redemption
  let couponDiscount = 0;
  let appliedCouponCode;
  if (couponCode) {
    const coupon = await Coupon.findOneAndUpdate(
      {
        organizationId: org._id,
        code: couponCode.toUpperCase().trim(),
        isActive: true,
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
          { $or: [{ maxUses: 0 }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
        ],
      },
      { $inc: { usedCount: 1 } },
      { new: false }
    ).lean();

    if (!coupon) throw ApiError.badRequest("Invalid, expired, or fully used coupon code");
    if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: -1 } });
      throw ApiError.badRequest(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
    }

    couponDiscount = coupon.type === "percent"
      ? Number(((subtotal * coupon.value) / 100).toFixed(2))
      : Math.min(coupon.value, subtotal);
    appliedCouponCode = coupon.code;
  }

  const totalAmount = Number((subtotal + taxTotal + deliveryCharge - couponDiscount).toFixed(2));

  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id).lean();
  const order = await StorefrontOrder.create({
    organizationId: org._id,
    customerId: req.storefrontCustomer._id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    orderNumber: generateOrderNumber(org.slug),
    items: orderItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    deliveryCharge,
    couponCode: appliedCouponCode,
    couponDiscount,
    totalAmount,
    fulfillmentType,
    deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : undefined,
    paymentMethod,
    notes,
    statusHistory: [{ status: "pending", note: "Order placed" }],
  });

  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, soldCount: item.qty } });
  }

  // Auto-generate Invoice record (fire & forget — order succeeds even if this fails)
  (async () => {
    try {
      const orgDoc = await Organization.findById(org._id);
      const invoiceNumber = await genInvoiceNumber(orgDoc);
      const pmMap = { cash: "cash", upi: "upi", card: "card" };
      const da = order.deliveryAddress;
      await Invoice.create({
        invoiceNumber,
        storefrontOrderId: order._id,
        organizationId: org._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: da ? [da.street, da.city, da.state, da.zip].filter(Boolean).join(", ") : undefined,
        items: orderItems.map(i => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          price: i.unitPrice,
          taxPercent: i.taxPercent,
          taxAmount: i.taxAmount,
          lineTotal: i.lineTotal,
        })),
        subtotal: order.subtotal,
        discount: order.couponDiscount || 0,
        deliveryCharge: order.deliveryCharge || 0,
        taxTotal: order.taxTotal,
        grandTotal: order.totalAmount,
        amountPaid: paymentMethod === "cash" ? 0 : 0,
        status: "unpaid",
        paymentMethod: pmMap[paymentMethod] || "other",
        notes: notes || undefined,
        date: new Date(),
      });
    } catch (err) {
      logger.error("Auto-invoice generation failed for storefront order:", err.message);
    }
  })();

  return ApiResponse.created(res, "Order placed", order);
});

export const getCustomerOrders = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    StorefrontOrder.find({ organizationId: org._id, customerId: req.storefrontCustomer._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    StorefrontOrder.countDocuments({ organizationId: org._id, customerId: req.storefrontCustomer._id }),
  ]);

  return ApiResponse.paginated(res, "Orders", {
    docs: orders, totalDocs: total, limit: Number(limit),
    page: Number(page), totalPages: Math.ceil(total / Number(limit)),
  });
});

export const getCustomerOrder = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const order = await StorefrontOrder.findOne({
    _id: req.params.orderId,
    organizationId: org._id,
    customerId: req.storefrontCustomer._id,
  }).lean();
  if (!order) throw ApiError.notFound("Order not found");
  return ApiResponse.ok(res, "Order", order);
});

// ── Payments ──────────────────────────────────────────────────────────────────
export const initiateJuspayPayment = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { orderId } = req.body;

  if (!org.storefront.juspay?.enabled) throw ApiError.badRequest("Juspay not configured for this store");

  const order = await StorefrontOrder.findOne({
    _id: orderId, organizationId: org._id, customerId: req.storefrontCustomer._id,
  });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.paymentStatus === "paid") throw ApiError.badRequest("Order already paid");

  const customer = await StorefrontCustomer.findById(req.storefrontCustomer._id).lean();
  const juspayOrderId = `sf-${order._id}-${Date.now()}`;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  const juspayResp = await createJuspayOrder({
    merchantId: org.storefront.juspay.merchantId,
    apiKey: org.storefront.juspay.apiKey,
    environment: org.storefront.juspay.environment || "sandbox",
    order: {
      orderId: juspayOrderId,
      amount: order.totalAmount,
      customerId: `sf-${customer._id}`,
      customerEmail: customer.email,
      customerPhone: customer.phone || "9999999999",
      returnUrl: `${clientUrl}/store/${req.params.slug}/order/${order._id}?payment=done`,
      description: `Order ${order.orderNumber}`,
    },
  });

  order.juspayOrderId = juspayOrderId;
  await order.save();

  return ApiResponse.ok(res, "Payment initiated", {
    paymentLink: juspayResp.payment_links?.web || juspayResp.payment_link,
    juspayOrderId,
  });
});

export const juspayWebhook = asyncHandler(async (req, res) => {
  const { order_id, status, txn_id } = req.body;
  if (!order_id) return res.sendStatus(200);

  const order = await StorefrontOrder.findOne({ juspayOrderId: order_id });
  if (!order) return res.sendStatus(200);

  if (status === "CHARGED" || status === "SUCCESS") {
    order.paymentStatus = "paid";
    order.paidAt = new Date();
    order.juspayPaymentId = txn_id;
    if (order.status === "pending") {
      order.status = "confirmed";
      order.statusHistory.push({ status: "confirmed", note: "Payment received via Juspay" });
    }
    await order.save();
    logger.info(`Juspay payment confirmed for order ${order._id}`);
  } else if (["FAILED", "AUTHORIZATION_FAILED", "DECLINED"].includes(status)) {
    order.paymentStatus = "failed";
    await order.save();
  }

  return res.sendStatus(200);
});

export const submitUtr = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  const { orderId, utrNumber } = req.body;

  if (!utrNumber || utrNumber.trim().length < 8) throw ApiError.badRequest("Invalid UTR number");

  const order = await StorefrontOrder.findOne({
    _id: orderId,
    organizationId: org._id,
    customerId: req.storefrontCustomer._id,
    paymentMethod: "upi",
  });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.paymentStatus === "paid") throw ApiError.badRequest("Order already paid");

  order.utrNumber = utrNumber.trim();
  order.statusHistory.push({ status: order.status, note: `Customer submitted UTR: ${utrNumber.trim()}` });
  await order.save();

  return ApiResponse.ok(res, "UTR submitted. Payment will be verified by the store.");
});

export const getOrderInvoicePdf = asyncHandler(async (req, res) => {
  const org = await resolveOrg(req.params.slug);
  // Verify the order belongs to this customer
  const order = await StorefrontOrder.findOne({
    _id: req.params.orderId,
    customerId: req.storefrontCustomer._id,
    organizationId: org._id,
  }).lean();
  if (!order) throw ApiError.notFound("Order not found");

  const invoice = await Invoice.findOne({ storefrontOrderId: order._id }).lean();
  if (!invoice) throw ApiError.notFound("Invoice not yet generated for this order");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
  const doc = new PDFDocument({ margin: 40, size: "A4", info: { Title: invoice.invoiceNumber } });
  doc.pipe(res);
  buildPDF(doc, invoice, org);
  doc.end();
});
