import test from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import moment from "moment";
import { db } from "../database.js";
import models from "../models/index.js";
import organisationService from "../service/organisation.service.js";
import { SystemFunction } from "../class/system.function.js";
import { Acl } from "../class/acl.js";

/**
 * Organisation signup linkage tests.
 * Uses a rolled-back transaction so the shared DB is not polluted.
 */
test("org signup creates membership, employee, wage, payroll, holiday, payroll calendar", async (t) => {
  const transaction = await db.transaction();
  t.after(async () => {
    await transaction.rollback();
  });

  const now = moment().utc().format();
  const suffix = Date.now();

  const orgAdminRole = await models.SystemRoles.findOne({
    where: { code: "org-admin" },
    raw: true,
    transaction,
  });
  assert.ok(orgAdminRole, "org-admin system role must exist");

  const user = await models.Users.create(
    {
      first_name: "Signup",
      last_name: "Tester",
      email: `signup.tester.${suffix}@example.com`,
      firebase_user_id: `uid-signup-${suffix}`,
      phone_number: "9000000000",
      phone_country_code: "+91",
      phone_country_iso: "IN",
      created_at: now,
    },
    { transaction },
  );

  await models.FirebaseProviders.create(
    {
      user_id: user.id,
      provider_id: "password",
      uid: `uid-signup-${suffix}`,
    },
    { transaction },
  );

  await models.UserSystemRoles.create(
    {
      user_id: user.id,
      role_id: orgAdminRole.id,
    },
    { transaction },
  );

  const org = await models.Organisations.create(
    {
      name: `Signup Test Org ${suffix}`,
      email: user.email,
      phone_number: "9000000000",
      phone_country_code: "+91",
      phone_country_iso: "IN",
      default_country: "IN",
      code: `T${String(suffix).slice(-7)}`,
      created_at: now,
      updated_at: now,
    },
    { transaction },
  );

  const ownerRole = await models.OrganisationRoles.findOne({
    where: { code: "owner" },
    raw: true,
    transaction,
  });
  await models.UserOrganisationRoles.create(
    {
      organisation_id: org.id,
      user_id: user.id,
      role_id: ownerRole.id,
    },
    { transaction },
  );

  const weekly = await models.PayCycles.findOne({
    where: { code: "WEEKLY" },
    raw: true,
    transaction,
  });
  const startDate = moment().format("YYYY-MM-DD");
  const endDate = await SystemFunction.getPayrollEndDateByPayCycleType(
    "WEEKLY",
    startDate,
  );
  const payrollCalendar = await models.PayrollCalendars.create(
    {
      organisation_id: org.id,
      name: "Default",
      pay_cycle_id: weekly.id,
      start_date: startDate,
      end_date: endDate,
      first_payment_date: moment().add(7, "days").format("YYYY-MM-DD"),
      default: true,
      created_at: now,
      created_by: user.id,
      updated_at: now,
      updated_by: user.id,
    },
    { transaction },
  );

  await models.HolidayCalendars.create(
    {
      organisation_id: org.id,
      name: "Republic Day",
      date: `${moment().year()}-01-26`,
      created_at: now,
      created_by: user.id,
      updated_at: now,
      updated_by: user.id,
    },
    { transaction },
  );

  const employee = await organisationService.createOrgAdminEmployee(
    org.id,
    user,
    transaction,
    { payrollCalendarId: payrollCalendar.id },
  );

  assert.ok(employee?.id, "employee created");

  const membership = await models.UserOrganisationRoles.findOne({
    where: { user_id: user.id, organisation_id: org.id },
    include: [{ model: models.OrganisationRoles, as: "role" }],
    transaction,
  });
  assert.equal(membership?.role?.code, "owner");

  const wage = await models.EmployeeWages.findOne({
    where: { employee_id: employee.id },
    transaction,
  });
  assert.ok(wage, "owner wage profile created");
  assert.equal(wage.payroll_calendar_id, payrollCalendar.id);

  const payroll = await models.EmployeePayrolls.findOne({
    where: { employee_id: employee.id },
    transaction,
  });
  assert.ok(payroll, "owner payroll profile created");

  const holidayCount = await models.HolidayCalendars.count({
    where: { organisation_id: org.id },
    transaction,
  });
  assert.equal(holidayCount, 1);

  const acl = await Acl.organisationAcl("owner");
  assert.equal(acl.employee.create, true);
  assert.equal(acl.customer.delete, true);
});
