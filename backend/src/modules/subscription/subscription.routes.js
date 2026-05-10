import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import Subscription from "./subscription.model.js";
import Plan from "../plan/plan.model.js";
import Organization from "../organization/organization.model.js";
import { PLAN_FEATURES, PLAN_LIMITS } from "../../utils/featureKeys.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const enrichSub = (sub) => {
  const ep = sub.effectivePlanOverride || sub.planSlug || "free";
  return {
    ...sub.toObject(),
    effectivePlan: ep,
    featureKeys: PLAN_FEATURES[ep] || [],
    limits: PLAN_LIMITS[ep] || PLAN_LIMITS.free,
  };
};

// ── Current org's subscription ────────────────────────────────────────────────

export const getMySub = asyncHandler(async (req, res) => {
  let sub = await Subscription.findOne({ organizationId: req.organizationId });
  if (!sub) {
    // Org has no subscription — default to free
    sub = await Subscription.create({ organizationId: req.organizationId, planSlug: "free", status: "active" });
  }
  // Auto-expire if past endDate
  if (sub.endDate && sub.endDate < new Date() && sub.status === "active") {
    sub.status = "expired";
    await sub.save();
  }
  return ApiResponse.ok(res, "Subscription", enrichSub(sub));
});

// ── SuperAdmin: list all subscriptions ───────────────────────────────────────

export const adminList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, planSlug, search } = req.query;
  const orgs = search
    ? (await Organization.find({ name: { $regex: search, $options: "i" } }).select("_id").lean()).map(o => o._id)
    : null;

  const filter = {};
  if (status)   filter.status = status;
  if (planSlug) filter.planSlug = planSlug;
  if (orgs)     filter.organizationId = { $in: orgs };

  const total = await Subscription.countDocuments(filter);
  const subs = await Subscription.find(filter)
    .populate("organizationId", "name email")
    .populate("overrideGrantedBy", "name")
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(+limit)
    .lean();

  return ApiResponse.paginated(res, "Subscriptions", {
    docs: subs, totalDocs: total, page: +page, limit: +limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ── SuperAdmin: get or create subscription for an org ────────────────────────

export const adminGetSub = asyncHandler(async (req, res) => {
  let sub = await Subscription.findOne({ organizationId: req.params.orgId })
    .populate("organizationId", "name email")
    .populate("overrideGrantedBy", "name");
  if (!sub) sub = await Subscription.create({ organizationId: req.params.orgId, planSlug: "free" });
  return ApiResponse.ok(res, "Subscription", enrichSub(sub));
});

// ── SuperAdmin: assign / update a subscription ────────────────────────────────
// Body: { planSlug, billingCycle, startDate, endDate, status }

export const adminSetPlan = asyncHandler(async (req, res) => {
  const { planSlug, billingCycle, startDate, endDate, status } = req.body;
  if (!planSlug) throw ApiError.badRequest("planSlug is required");

  const plan = await Plan.findOne({ slug: planSlug });
  if (!plan) throw ApiError.badRequest("Invalid plan slug");

  const update = { planSlug, billingCycle, status: status || "active" };
  if (startDate) update.startDate = new Date(startDate);
  if (endDate)   update.endDate   = new Date(endDate);

  const sub = await Subscription.findOneAndUpdate(
    { organizationId: req.params.orgId },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  ).populate("organizationId", "name email");

  return ApiResponse.ok(res, "Subscription updated", enrichSub(sub));
});

// ── SuperAdmin: record a payment ──────────────────────────────────────────────

export const adminRecordPayment = asyncHandler(async (req, res) => {
  const { amount, cycle, method, reference, notes, paidAt } = req.body;
  if (!amount || amount <= 0) throw ApiError.badRequest("Valid amount required");

  const sub = await Subscription.findOne({ organizationId: req.params.orgId });
  if (!sub) throw ApiError.notFound("Subscription not found");

  sub.payments.push({ amount, cycle, method, reference, notes, paidAt: paidAt || new Date(), recordedBy: req.user._id });
  await sub.save();

  return ApiResponse.ok(res, "Payment recorded", enrichSub(sub));
});

// ── SuperAdmin: set / clear waiver (treat org as higher plan) ─────────────────
// Body: { effectivePlanOverride: "pro"|null, reason, expiresAt? }

export const adminSetWaiver = asyncHandler(async (req, res) => {
  const { effectivePlanOverride, reason, expiresAt } = req.body;

  const update = {
    effectivePlanOverride: effectivePlanOverride || null,
    overrideReason:    effectivePlanOverride ? (reason || "") : null,
    overrideGrantedBy: effectivePlanOverride ? req.user._id : null,
    overrideExpiresAt: effectivePlanOverride && expiresAt ? new Date(expiresAt) : null,
  };

  const sub = await Subscription.findOneAndUpdate(
    { organizationId: req.params.orgId },
    { $set: update },
    { new: true, upsert: true }
  ).populate("organizationId", "name email").populate("overrideGrantedBy", "name");

  return ApiResponse.ok(res, effectivePlanOverride ? "Waiver applied" : "Waiver removed", enrichSub(sub));
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();
router.use(authenticate);

// All authenticated users can check their own subscription
router.get("/my", getMySub);

// SuperAdmin only
router.get("/admin",                         authorize("superAdmin"), adminList);
router.get("/admin/:orgId",                  authorize("superAdmin"), adminGetSub);
router.post("/admin/:orgId/plan",            authorize("superAdmin"), adminSetPlan);
router.post("/admin/:orgId/payment",         authorize("superAdmin"), adminRecordPayment);
router.patch("/admin/:orgId/waiver",         authorize("superAdmin"), adminSetWaiver);

export default router;
