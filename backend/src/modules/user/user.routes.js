import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import crypto from "crypto";
import User from "./user.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  const result = await paginate(User, filter, { page, limit, select: "-password -refreshTokens" });
  return ApiResponse.paginated(res, "Users", result);
});

export const invite = asyncHandler(async (req, res) => {
  const { email, name, role } = req.body;
  const existing = await User.findOne({ email }).lean();
  if (existing) throw ApiError.conflict("Email already registered");
  const raw = crypto.randomBytes(20).toString("hex");
  const user = await User.create({
    name, email, password: raw + "Aa1!",
    role: role || "staff",
    organizationId: req.organizationId,
    inviteToken: crypto.createHash("sha256").update(raw).digest("hex"),
    inviteExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  // TODO: send invite email with raw token
  return ApiResponse.created(res, "User invited", { id: user._id, email: user.email, name: user.name, role: user.role });
});

export const updateRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw ApiError.badRequest("Cannot change own role");
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { role: req.body.role },
    { new: true }
  ).select("-password -refreshTokens");
  if (!user) throw ApiError.notFound("User not found");
  return ApiResponse.ok(res, "Role updated", user);
});

export const toggleActive = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw ApiError.badRequest("Cannot deactivate yourself");
  const user = await User.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!user) throw ApiError.notFound("User not found");
  user.isActive = !user.isActive;
  if (!user.isActive) user.refreshTokens = [];
  await user.save({ validateBeforeSave: false });
  return ApiResponse.ok(res, `User ${user.isActive ? "activated" : "deactivated"}`, { id: user._id, isActive: user.isActive });
});

export const remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw ApiError.badRequest("Cannot remove yourself");
  const user = await User.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!user) throw ApiError.notFound("User not found");
  await user.softDelete(req.user._id);
  return ApiResponse.ok(res, "User removed");
});

import { requireUserLimit } from "../../middleware/featureGate.js";

const router = Router();
router.use(authenticate);
router.get("/",              authorize("admin","superAdmin"), list);
router.post("/invite",       authorize("admin","superAdmin"), requireUserLimit, invite);
router.patch("/:id/role",    authorize("admin","superAdmin"), updateRole);
router.patch("/:id/toggle",  authorize("admin","superAdmin"), toggleActive);
router.delete("/:id",        authorize("admin","superAdmin"), remove);
export default router;
