import crypto from "crypto";
import User from "../user/user.model.js";
import Organization from "../organization/organization.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { signToken, signRefreshToken, verifyRefreshToken } from "../../middleware/auth.js";
import logger from "../../utils/logger.js";

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-");

export const register = async ({ name, email, password, storeName, organizationName, storeType }) => {
  const existing = await User.findOne({ email }).lean();
  if (existing) throw ApiError.conflict("Email already registered");

  const orgName = storeName || organizationName || `${name.split(" ")[0]}'s Store`;
  const org = await Organization.create({
    name: orgName,
    storeName: orgName,
    storeType: storeType || "general",
    createdBy: null,
  });

  const user = await User.create({ name, email, password, organizationId: org._id, role: "admin" });

  await Organization.findByIdAndUpdate(org._id, { createdBy: user._id });

  const accessToken = signToken(user._id, org._id, user.role);
  const refreshToken = signRefreshToken(user._id);
  await _storeRefreshToken(user._id, refreshToken);

  logger.info(`New registration: ${email} | org: ${org.name}`);
  return { user: _safe(user), organization: org, accessToken, refreshToken };
};

export const login = async ({ email, password, userAgent, ip }) => {
  const user = await User.findOne({ email }).select("+password +refreshTokens +loginAttempts +lockUntil");
  if (!user) throw ApiError.unauthorized("Invalid email or password");
  if (user.isLocked) throw ApiError.forbidden("Account temporarily locked. Try again later.");
  if (!user.isActive) throw ApiError.forbidden("Account deactivated");

  const ok = await user.comparePassword(password);
  if (!ok) { await user.incLoginAttempts(); throw ApiError.unauthorized("Invalid email or password"); }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = signToken(user._id, user.organizationId, user.role);
  const refreshToken = signRefreshToken(user._id);
  await _storeRefreshToken(user._id, refreshToken, userAgent);

  const org = user.organizationId ? await Organization.findById(user.organizationId).lean() : null;
  return { user: _safe(user), organization: org, accessToken, refreshToken };
};

export const refresh = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.sub).select("+refreshTokens");
  if (!user) throw ApiError.unauthorized("User not found");
  const stored = user.refreshTokens.find(t => t.token === token && t.expiresAt > new Date());
  if (!stored) throw ApiError.unauthorized("Refresh token revoked");
  user.refreshTokens = user.refreshTokens.filter(t => t.token !== token);
  await user.save({ validateBeforeSave: false });
  const accessToken = signToken(user._id, user.organizationId, user.role);
  const refreshToken = signRefreshToken(user._id);
  await _storeRefreshToken(user._id, refreshToken);
  return { accessToken, refreshToken };
};

export const logout = async (userId, refreshToken) => {
  await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: { token: refreshToken } } });
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent – prevent enumeration
  const raw = crypto.randomBytes(32).toString("hex");
  user.inviteToken = crypto.createHash("sha256").update(raw).digest("hex");
  user.inviteExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  // TODO: send email with raw token
  logger.info(`Password reset requested for ${email}`);
  return raw;
};

export const resetPassword = async (token, password) => {
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({ inviteToken: hashed, inviteExpires: { $gt: new Date() } });
  if (!user) throw ApiError.badRequest("Invalid or expired reset token");
  user.password = password;
  user.inviteToken = undefined;
  user.inviteExpires = undefined;
  user.refreshTokens = [];
  await user.save();
};

export const changePassword = async (userId, current, next_) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw ApiError.notFound("User not found");
  if (!await user.comparePassword(current)) throw ApiError.unauthorized("Current password is incorrect");
  user.password = next_;
  user.refreshTokens = [];
  await user.save();
};

const _storeRefreshToken = async (userId, token, userAgent = "") => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await User.findByIdAndUpdate(userId, {
    $push: { refreshTokens: { $each: [{ token, expiresAt, userAgent }], $slice: -5 } }
  });
};

const _safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, organizationId: u.organizationId, isEmailVerified: u.isEmailVerified, lastLogin: u.lastLogin });
