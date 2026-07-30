import express from "express";
const router = express.Router();
import {
  organisationRoles,
  nokRelations,
  allCustomers,
  earningRateTypes,
  leaveCategories,
  timesheetSubmissionFrequencies,
  payCycles,
  awardRateRuleFields,
  awardRateRuleDays,
  roundingIntervals,
  managerEmployees,
  managerStaffEmployees,
  employmentStatus,
  employmentTypes,
  payrollCalendars,
  awardRates,
  earningRates,
  employees,
  jobs,
  employeeTimesheets,
  states,
} from "../../controller/system.controller.js";
import OrganisationValidate from "../../middleware/organisationvalidate.js";

router.get("/organisation-roles", OrganisationValidate, organisationRoles);
router.get("/nok-relations", nokRelations);
router.get("/customers", OrganisationValidate, allCustomers);
router.get("/earning-rate-types", OrganisationValidate, earningRateTypes);
router.get("/leave-categories", leaveCategories);
router.get("/timesheet-submission-frequencies", timesheetSubmissionFrequencies);
router.get("/pay-cycles", payCycles);
router.get("/award-rate-rule-fields", awardRateRuleFields);
router.get("/award-rate-rule-days", awardRateRuleDays);
router.get("/rounding-intervals", roundingIntervals);
router.get("/manager-employees", OrganisationValidate, managerEmployees);
router.get(
  "/manager-staff-employees",
  OrganisationValidate,
  managerStaffEmployees
);
router.get("/employment-status", employmentStatus);
router.get("/employment-types", employmentTypes);
router.get("/payroll-calendars", OrganisationValidate, payrollCalendars);
router.get("/award-rates", OrganisationValidate, awardRates);
router.get("/earning-rates", OrganisationValidate, earningRates);
router.get("/employees", OrganisationValidate, employees);
router.get("/jobs", OrganisationValidate, jobs);
router.get("/employee-timesheets", OrganisationValidate, employeeTimesheets);
router.get("/states", states);

export default router;
