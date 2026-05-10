import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { PLAN_FEATURES, PLAN_LIMITS } from "../utils/featureKeys.js";
import Subscription from "../modules/subscription/subscription.model.js";
import Plan from "../modules/plan/plan.model.js";
import Product from "../modules/product/product.model.js";

const getEffectivePlan = async (organizationId) => {
  const sub = await Subscription.findOne({ organizationId }).lean();
  if (!sub) return { plan: "free", status: "active" };

  // Auto-check expiry
  if (sub.endDate && sub.endDate < new Date()) return { plan: "free", status: "expired" };

  const plan = sub.effectivePlanOverride || sub.planSlug || "free";
  return { plan, status: sub.status };
};

// Gate a route behind a feature key
export const requireFeature = (featureKey) =>
  asyncHandler(async (req, res, next) => {
    const { plan, status } = await getEffectivePlan(req.organizationId);

    if (status === "expired") {
      throw new ApiError(403, "Your subscription has expired. Please renew to continue.", "SUBSCRIPTION_EXPIRED");
    }

    const allowed = PLAN_FEATURES[plan] || [];
    if (!allowed.includes(featureKey)) {
      throw new ApiError(
        403,
        "This feature is not available on your current plan. Please upgrade to continue.",
        "UPGRADE_REQUIRED"
      );
    }
    next();
  });

// Check product count limit before creating a product
export const requireProductLimit = asyncHandler(async (req, res, next) => {
  const { plan } = await getEffectivePlan(req.organizationId);
  const limit = PLAN_LIMITS[plan]?.products ?? 50;
  if (limit === -1) return next();

  const count = await Product.countDocuments({ organizationId: req.organizationId, isDeleted: false });
  if (count >= limit) {
    throw new ApiError(
      403,
      `You've reached the product limit (${limit} products) on your current plan. Please upgrade.`,
      "LIMIT_REACHED"
    );
  }
  next();
});

// Check user count limit before inviting a user
export const requireUserLimit = asyncHandler(async (req, res, next) => {
  const { plan } = await getEffectivePlan(req.organizationId);
  const limit = PLAN_LIMITS[plan]?.users ?? 1;
  if (limit === -1) return next();

  const User = (await import("../modules/user/user.model.js")).default;
  const count = await User.countDocuments({ organizationId: req.organizationId, isDeleted: false });
  if (count >= limit) {
    throw new ApiError(
      403,
      `You've reached the user limit (${limit} users) on your current plan. Please upgrade.`,
      "LIMIT_REACHED"
    );
  }
  next();
});
