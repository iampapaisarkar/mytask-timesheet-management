import express from "express";
const router = express.Router();
import {
  organisationRoles,
  allCustomers,
  leaveCategories,
  timesheetSubmissionFrequencies,
  payCycles,
  roundingIntervals,
  managerEmployees,
  managerStaffEmployees,
  employmentStatus,
  employmentTypes,
  payrollCalendars,
  employees,
  jobs,
  employeeTimesheets,
  states,
  organisationSetupStatus,
} from "../../controller/system.controller.js";
import OrganisationValidate from "../../middleware/organisationvalidate.js";

router.get("/organisation-roles", OrganisationValidate, organisationRoles);
router.get("/customers", OrganisationValidate, allCustomers);
router.get("/leave-categories", leaveCategories);
router.get("/timesheet-submission-frequencies", timesheetSubmissionFrequencies);
router.get("/pay-cycles", payCycles);
router.get("/rounding-intervals", roundingIntervals);
router.get("/manager-employees", OrganisationValidate, managerEmployees);
router.get(
  "/manager-staff-employees",
  OrganisationValidate,
  managerStaffEmployees,
);
router.get("/employment-status", employmentStatus);
router.get("/employment-types", employmentTypes);
router.get("/payroll-calendars", OrganisationValidate, payrollCalendars);
router.get("/employees", OrganisationValidate, employees);
router.get("/jobs", OrganisationValidate, jobs);
router.get("/employee-timesheets", OrganisationValidate, employeeTimesheets);
router.get("/states", states);
router.get(
  "/organisation-setup",
  OrganisationValidate,
  organisationSetupStatus,
);

export default router;
