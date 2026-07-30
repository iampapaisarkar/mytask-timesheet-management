import models from "../models/index.js";

const { HolidayCalendars, PayrollCalendars } = models;

/**
 * Org must have at least one holiday calendar and one payroll calendar
 * before operational workflows (employees, jobs, timesheets, customers).
 */
export async function assertOrganisationSetupComplete(organisationId) {
  const [holidayCount, payrollCount] = await Promise.all([
    HolidayCalendars.count({ where: { organisation_id: organisationId } }),
    PayrollCalendars.count({ where: { organisation_id: organisationId } }),
  ]);

  const missing = [];
  if (!holidayCount) missing.push("Holiday Calendar");
  if (!payrollCount) missing.push("Payroll Calendar");

  if (missing.length) {
    const err = new Error(
      `Complete organisation setup before continuing. Missing: ${missing.join(", ")}.`,
    );
    err.statusCode = 400;
    err.code = "ORG_SETUP_INCOMPLETE";
    err.missing = missing;
    throw err;
  }

  return { holidayCount, payrollCount };
}

export async function getOrganisationSetupStatus(organisationId) {
  const [holidayCount, payrollCount] = await Promise.all([
    HolidayCalendars.count({ where: { organisation_id: organisationId } }),
    PayrollCalendars.count({ where: { organisation_id: organisationId } }),
  ]);
  return {
    holiday_calendar_configured: holidayCount > 0,
    payroll_calendar_configured: payrollCount > 0,
    is_complete: holidayCount > 0 && payrollCount > 0,
    missing: [
      ...(holidayCount ? [] : ["Holiday Calendar"]),
      ...(payrollCount ? [] : ["Payroll Calendar"]),
    ],
  };
}

export default {
  assertOrganisationSetupComplete,
  getOrganisationSetupStatus,
};
