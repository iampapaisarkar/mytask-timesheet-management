import express from "express";
import OrganisationValidate from "../../middleware/organisationvalidate.js";
import {
  orgBootstrap,
  homeBootstrap,
  employeeForm,
  timesheetDayEditor,
  dashboard,
} from "../../controller/screens.controller.js";

const router = express.Router();

/** TokenValidate applied by parent. Org bootstrap resolves by org_code (deep-link safe). */
router.get("/org-bootstrap", orgBootstrap);
router.get("/home", homeBootstrap);

router.get("/employee-form", OrganisationValidate, employeeForm);
router.get("/timesheet-day-editor", OrganisationValidate, timesheetDayEditor);
router.get("/dashboard", OrganisationValidate, dashboard);

export default router;
