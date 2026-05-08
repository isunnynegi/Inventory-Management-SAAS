import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import StorefrontCustomer from "./storefrontCustomer.model.js";

const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;

export const authenticateCustomer = asyncHandler(async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) throw ApiError.unauthorized("No token provided");
  const token = auth.split(" ")[1];

  let decoded;
  try { decoded = jwt.verify(token, CUSTOMER_JWT_SECRET); }
  catch { throw ApiError.unauthorized("Invalid or expired token"); }

  if (decoded.type !== "storefront_customer") throw ApiError.unauthorized("Invalid token type");

  const customer = await StorefrontCustomer.findById(decoded.sub).lean();
  if (!customer) throw ApiError.unauthorized("Customer not found");
  if (!customer.isActive) throw ApiError.forbidden("Account deactivated");

  req.storefrontCustomer = customer;
  next();
});
