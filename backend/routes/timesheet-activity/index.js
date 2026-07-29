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
router.post("/send-location", sendLocation);
router.get("/", TokenValidate, OrganisationValidate, activity);
router.get(
  "/validate",
  TokenValidate,
  OrganisationValidate,
  timesheetValidation
);
router.get("/simulate", simulate);

export default router;
