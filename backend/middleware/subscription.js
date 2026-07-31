import subscriptionService from "../service/subscription/subscription.service.js";

/**
 * Factory: assert a boolean plan feature for the acting user.
 */
export function requirePlanFeature(featureKey) {
  return async function requirePlanFeatureMiddleware(req, res, next) {
    try {
      const user = req.user || req.body?.user;
      if (!user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await subscriptionService.assertBooleanFeature(user.id, featureKey);
      return next();
    } catch (err) {
      return res.status(err.statusCode || 403).json({
        message: err.message,
        code: err.code || "PLAN_FEATURE_DISABLED",
        feature: err.feature || featureKey,
      });
    }
  };
}

/**
 * Attach subscription context to req for downstream handlers.
 */
export async function attachSubscriptionContext(req, res, next) {
  try {
    const user = req.user || req.body?.user;
    if (!user?.id) return next();
    req.subscriptionContext = await subscriptionService.getUserPlanContext(
      user.id,
    );
    return next();
  } catch (err) {
    console.error("attachSubscriptionContext:", err?.message || err);
    return next();
  }
}

/**
 * Resolve organisation owner user id for workspace quota checks.
 */
export async function resolveWorkspaceOwner(req, res, next) {
  try {
    const organisation = req.body?.organisation;
    if (!organisation?.id) return next();
    const ownerId = await subscriptionService.resolveOrgOwnerUserId(
      organisation.id,
    );
    req.workspaceOwnerUserId = ownerId || req.body?.user?.id;
    return next();
  } catch (err) {
    console.error("resolveWorkspaceOwner:", err?.message || err);
    req.workspaceOwnerUserId = req.body?.user?.id;
    return next();
  }
}

export default {
  requirePlanFeature,
  attachSubscriptionContext,
  resolveWorkspaceOwner,
};
