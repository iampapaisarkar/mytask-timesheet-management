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
import TrackingTokenValidate from "../../middleware/trackingtokenvalidate.js";

/**
 * Location write paths use durable tracking tokens (mttrk_…), not Firebase ID
 * tokens or FCM. Works while the app is terminated.
 */
router.post("/store", TrackingTokenValidate, store);
router.post("/send-location", TrackingTokenValidate, sendLocation);

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
