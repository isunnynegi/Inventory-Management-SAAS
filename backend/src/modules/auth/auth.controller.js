import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as svc from "./auth.service.js";

const setCookie = (res, token) => res.cookie("refreshToken", token, {
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000
});

export const register = asyncHandler(async (req, res) => {
  const result = await svc.register(req.body);
  setCookie(res, result.refreshToken);
  return ApiResponse.created(res, "Account created", { user: result.user, organization: result.organization, accessToken: result.accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const result = await svc.login({ ...req.body, userAgent: req.headers["user-agent"], ip: req.ip });
  setCookie(res, result.refreshToken);
  return ApiResponse.ok(res, "Login successful", { user: result.user, organization: result.organization, accessToken: result.accessToken });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: "Refresh token required" });
  const tokens = await svc.refresh(token);
  setCookie(res, tokens.refreshToken);
  return ApiResponse.ok(res, "Token refreshed", { accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  await svc.logout(req.user._id, token);
  res.clearCookie("refreshToken");
  return ApiResponse.ok(res, "Logged out");
});

export const getMe = asyncHandler(async (req, res) => ApiResponse.ok(res, "Profile", req.user));

export const forgotPassword = asyncHandler(async (req, res) => {
  await svc.forgotPassword(req.body.email);
  return ApiResponse.ok(res, "If account exists, reset instructions sent.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await svc.resetPassword(req.body.token, req.body.password);
  return ApiResponse.ok(res, "Password reset successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
  await svc.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  res.clearCookie("refreshToken");
  return ApiResponse.ok(res, "Password changed. Please log in again.");
});
