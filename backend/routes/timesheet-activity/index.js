import express from "express";
const router = express.Router();
import {
  store,
  sendLocation,
  activity,
  timesheetValidation,
  simulate,
} from "../../controller/timesheet-activity.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";
import OrganisationValidate from "../../middleware/organisationvalidate.js";

router.post("/store", TokenValidate, OrganisationValidate, store);

/**
 * Background geolocation (native Transistorsoft) POSTs here without Axios
 * interceptors — it authenticates via body `userId` + `organisationCode`.
 * Require those fields; rate limiter (global) still applies.
 * Prefer migrating BGL to Authorization headers in a follow-up.
 */
function requireActivityIdentity(req, res, next) {
  const userId = req.body?.userId ?? req.body?.user_id;
  const organisationCode =
    req.body?.organisationCode ?? req.body?.organisation_code;
  if (!userId || !organisationCode) {
    return res.status(401).json({
      code: "AUTH_ACTIVITY_IDENTITY",
      message: "userId and organisationCode are required",
    });
  }
  return next();
}

router.post("/send-location", requireActivityIdentity, sendLocation);
router.get("/", TokenValidate, OrganisationValidate, activity);
router.get(
  "/validate",
  TokenValidate,
  OrganisationValidate,
  timesheetValidation,
);

/** Simulate is a load/test helper — disabled in production unless explicitly enabled. */
if (
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_ACTIVITY_SIMULATE === "true"
) {
  router.get("/simulate", TokenValidate, OrganisationValidate, simulate);
}

export default router;
