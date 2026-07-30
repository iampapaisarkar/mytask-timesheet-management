import express from "express";
import OrganisationValidate from "../../middleware/organisationvalidate.js";
import {
  orgBootstrap,
  homeBootstrap,
  employeeForm,
  timesheetDayEditor,
  dashboard,
  dashboardSummary,
  dashboardGraphs,
  dashboardRecent,
  dashboardPending,
} from "../../controller/screens.controller.js";

const router = express.Router();

/** TokenValidate applied by parent. Org bootstrap resolves by org_code (deep-link safe). */
router.get("/org-bootstrap", orgBootstrap);
router.get("/home", homeBootstrap);

router.get("/employee-form", OrganisationValidate, employeeForm);
router.get("/timesheet-day-editor", OrganisationValidate, timesheetDayEditor);

/** Split dashboard slices — load in parallel from clients. */
router.get("/dashboard/summary", OrganisationValidate, dashboardSummary);
router.get("/dashboard/graphs", OrganisationValidate, dashboardGraphs);
router.get("/dashboard/recent", OrganisationValidate, dashboardRecent);
router.get("/dashboard/pending", OrganisationValidate, dashboardPending);
/** Aggregate retained for backward compatibility. */
router.get("/dashboard", OrganisationValidate, dashboard);

export default router;
