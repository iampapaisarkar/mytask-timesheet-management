import express from "express";
const router = express.Router();
import {
  connect,
  finalize,
  disconnect,
  fetchEarningRates,
  fetchAccounts,
  fetchPayrollCalendars,
  pushData,
  pushTimesheet,
  fetchTestData,
} from "../../controller/xero.controller.js";
import TokenValidate from "../../middleware/tokenvalidate.js";
import OrganisationValidate from "../../middleware/organisationvalidate.js";

router.post("/connect", OrganisationValidate, connect);
router.post("/finalize", finalize);
router.post("/disconnect", OrganisationValidate, disconnect);
router.get("/fetch-earning-rates", OrganisationValidate, fetchEarningRates);
router.get("/fetch-accounts", OrganisationValidate, fetchAccounts);
router.get(
  "/fetch-payroll-calendars",
  OrganisationValidate,
  fetchPayrollCalendars,
);
router.post("/push-data", OrganisationValidate, pushData);
router.post("/push-timesheet", OrganisationValidate, pushTimesheet);
router.get("/fetch-test-data", OrganisationValidate, fetchTestData);

export default router;
