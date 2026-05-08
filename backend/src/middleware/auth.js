import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../modules/user/user.model.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) throw ApiError.unauthorized("No token provided");
  const token = auth.split(" ")[1];
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw ApiError.unauthorized("Invalid or expired token"); }

  const user = await User.findById(decoded.sub).select("-password -refreshTokens");
  if (!user) throw ApiError.unauthorized("User not found");
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  req.user = user;
  // Use token-embedded organizationId so impersonation tokens work
  req.organizationId = decoded.organizationId || user.organizationId;
  if (decoded.impersonatedBy) req.impersonating = true;
  next();
});

export const authorize = (...roles) => asyncHandler(async (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!roles.includes(req.user.role)) throw ApiError.forbidden(`Role '${req.user.role}' is not authorized`);
  next();
});

export const signToken = (userId, organizationId, role) =>
  jwt.sign({ sub: userId, organizationId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" });

export const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
  catch { throw ApiError.unauthorized("Invalid or expired refresh token"); }
};
