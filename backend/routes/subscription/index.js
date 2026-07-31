import express from "express";
import TokenValidate from "../../middleware/tokenvalidate.js";
import * as controller from "../../controller/subscription.controller.js";

const router = express.Router();

/** Public pricing catalogue (auth optional — current plan when logged in). */
router.get("/plans", optionalAuth, controller.listPlans);
router.get("/comparison", controller.planComparison);

router.get("/current", TokenValidate, controller.getCurrentSubscription);
router.get("/usage", TokenValidate, controller.getUsage);
router.get("/feature-limits", TokenValidate, controller.getFeatureLimits);
router.get("/billing-history", TokenValidate, controller.billingHistory);
router.post("/checkout", TokenValidate, controller.createCheckout);
router.post("/portal", TokenValidate, controller.createPortal);
router.post("/cancel", TokenValidate, controller.cancelSubscription);

export default router;

/**
 * Soft auth: if Bearer present, run TokenValidate; otherwise continue anonymously.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return TokenValidate(req, res, next);
  }
  return next();
}
