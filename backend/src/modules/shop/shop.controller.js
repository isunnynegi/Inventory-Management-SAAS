import jwt from "jsonwebtoken";
import Organization from "../organization/organization.model.js";
import StorefrontCustomer from "../storefront/storefrontCustomer.model.js";
import StorefrontOrder from "../storefrontOrder/storefrontOrder.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
const CUSTOMER_REFRESH_SECRET = process.env.CUSTOMER_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;

function signCustomerToken(customerId) {
  return jwt.sign({ sub: customerId, type: "storefront_customer" }, CUSTOMER_JWT_SECRET, { expiresIn: "7d" });
}
function signCustomerRefresh(customerId) {
  return jwt.sign({ sub: customerId, type: "storefront_customer" }, CUSTOMER_REFRESH_SECRET, { expiresIn: "30d" });
}

// Re-export slug-less–compatible controllers from storefront (login, logout, refresh, me, addresses, cart)
// These do NOT call resolveOrg, so they work without a :slug param.
export {
  customerLogin,
  customerLogout,
  customerRefresh,
  getCustomerMe,
  updateCustomerProfile,
  addAddress,
  removeAddress,
  setDefaultAddress,
  getCart,
  syncCart,
} from "../storefront/storefront.controller.js";

// Shop-specific register — no store org required (global account)
export const customerRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest("Name, email, and password are required");

  const existing = await StorefrontCustomer.findOne({ email });
  if (existing) throw ApiError.conflict("Email already registered");

  const customer = await StorefrontCustomer.create({ name, email, password, phone });
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

// List all stores with storefront enabled
export const listAllStores = asyncHandler(async (_req, res) => {
  const stores = await Organization.find({ "storefront.enabled": true, isActive: true })
    .select("name storeName slug currencySymbol logo storefront.branding storefront.deliveryEnabled storefront.pickupEnabled storeType")
    .lean();

  const data = stores.map(org => ({
    id: org._id,
    name: org.storeName || org.name,
    slug: org.slug,
    storeType: org.storeType,
    logo: org.logo,
    currencySymbol: org.currencySymbol || "₹",
    deliveryEnabled: org.storefront?.deliveryEnabled,
    pickupEnabled: org.storefront?.pickupEnabled,
    branding: org.storefront?.branding || {},
  }));

  return ApiResponse.ok(res, "Stores", data);
});

// All orders for the authenticated customer across all stores
export const getAllCustomerOrders = asyncHandler(async (req, res) => {
  const customerId = req.storefrontCustomer._id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    StorefrontOrder.find({ customerId })
      .populate("organizationId", "storeName name slug logo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StorefrontOrder.countDocuments({ customerId }),
  ]);

  return ApiResponse.ok(res, "Orders", orders, {
    totalDocs: total,
    totalPages: Math.ceil(total / limit),
    page,
    limit,
  });
});
