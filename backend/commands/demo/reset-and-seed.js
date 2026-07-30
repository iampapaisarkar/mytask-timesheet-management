#!/usr/bin/env node
/**
 * Production-quality demo reset + seed + integrity validation.
 *
 * Usage (from backend/):
 *   npm run demo:reset-seed
 *
 * Preserves lookup seeders + SequelizeMeta. Clears all application data,
 * then rebuilds a connected Siliguri demo org with the specified Firebase users.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import moment from "moment";
import { db } from "../../database.js";
import models from "../../models/index.js";
import organisationService from "../../service/organisation.service.js";
import { SystemFunction } from "../../class/system.function.js";
import { Acl } from "../../class/acl.js";
import {
  DEMO_ORG,
  DEMO_USERS,
  SILIGURI_SITES,
  LOOKUP_TABLES,
  APP_TABLES,
} from "./constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const REPORT_PATH = path.join(ROOT, "DEMO_QA_REPORT.md");

const log = (...args) => console.log(`[demo]`, ...args);
const warnings = [];
const failures = [];
const passed = [];

function pass(name, detail = "") {
  passed.push({ name, detail });
  log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failures.push({ name, detail });
  console.error(`[demo] FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  warnings.push({ name, detail });
  console.warn(`[demo] WARN  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function phase1Reset() {
  log("Phase 1 — Reset application data (preserve seeders)");
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of APP_TABLES) {
    try {
      await db.query(`TRUNCATE TABLE \`${table}\``);
      log(`  truncated ${table}`);
    } catch (err) {
      warn(`truncate ${table}`, err.message);
    }
  }
  await db.query("SET FOREIGN_KEY_CHECKS = 1");

  // Verify lookups still present
  for (const table of LOOKUP_TABLES) {
    if (table === "SequelizeMeta") continue;
    try {
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS c FROM \`${table}\``,
      );
      if (Number(row.c) === 0) {
        warn(`lookup empty: ${table}`, "re-run npm run seed:all");
      } else {
        log(`  lookup ok ${table} (${row.c})`);
      }
    } catch (err) {
      warn(`lookup check ${table}`, err.message);
    }
  }
  pass("Phase 1 reset");
}

async function ensureLookups() {
  const roles = await models.OrganisationRoles.count();
  const statuses = await models.TimesheetStatus.count();
  const payCycles = await models.PayCycles.count();
  if (!roles || !statuses || !payCycles) {
    fail(
      "Lookups missing",
      "Run `npm run seed:all` in backend/ before demo:reset-seed",
    );
    throw new Error("Lookup seeders missing");
  }
}

async function phase2AuditSignup(ownerUser, org, payrollCalendarId) {
  log("Phase 2 — Verify organisation signup artefacts");
  const membership = await models.UserOrganisationRoles.findOne({
    where: { user_id: ownerUser.id, organisation_id: org.id },
    include: [{ model: models.OrganisationRoles, as: "role" }],
  });
  const employee = await models.Employees.findOne({
    where: { user_id: ownerUser.id, organisation_id: org.id },
  });
  const wage = employee
    ? await models.EmployeeWages.findOne({ where: { employee_id: employee.id } })
    : null;
  const payroll = employee
    ? await models.EmployeePayrolls.findOne({
        where: { employee_id: employee.id },
      })
    : null;
  const holiday = await models.HolidayCalendars.findOne({
    where: { organisation_id: org.id },
  });

  if (!membership) fail("Owner membership");
  else if (membership.role?.code !== "owner")
    fail("Owner role", membership.role?.code);
  else pass("Owner membership + role");

  if (!employee) fail("Owner employee");
  else pass("Owner employee", `id=${employee.id}`);

  if (!wage) fail("Owner wage/profile");
  else pass("Owner wage", `calendar=${wage.payroll_calendar_id}`);

  if (!payroll) fail("Owner payroll profile");
  else pass("Owner payroll profile");

  if (!holiday) fail("Starter holiday calendar");
  else pass("Starter holiday calendar");

  if (!payrollCalendarId) fail("Default payroll calendar");
  else pass("Default payroll calendar", `id=${payrollCalendarId}`);

  return { employee, membership };
}

async function createUser(def, systemRoleId) {
  const now = moment().utc().format();
  const user = await models.Users.create({
    first_name: def.first_name,
    last_name: def.last_name,
    email: def.email,
    dob: def.dob,
    phone_number: def.phone_number,
    phone_country_code: "+91",
    phone_country_iso: "IN",
    firebase_user_id: def.firebase_uid,
    created_at: now,
  });
  await models.FirebaseProviders.create({
    user_id: user.id,
    provider_id: def.provider_id,
    uid: def.firebase_uid,
    photo_url: null,
  });
  await models.UserSystemRoles.create({
    user_id: user.id,
    role_id: systemRoleId,
  });
  await models.UserTimezones.create({
    user_id: user.id,
    timezone: "Asia/Kolkata",
  });
  return user;
}

async function seedOrganisation(owner) {
  const now = moment().utc().format();
  const org = await models.Organisations.create({
    ...DEMO_ORG,
    created_at: now,
    updated_at: now,
  });

  await models.OrganisationAddress.create({
    organisation_id: org.id,
    address_line_1: "Hill Cart Road",
    address_line_2: "Near City Centre",
    street: "Hill Cart Road",
    city: "Siliguri",
    state_region_province: "West Bengal",
    postal_code: "734001",
    country: "India",
    country_code: "IN",
    formatted_address: "Hill Cart Road, Siliguri, West Bengal 734001, India",
    latitude: 26.7271,
    longitude: 88.3953,
  });

  const ownerRole = await models.OrganisationRoles.findOne({
    where: { code: "owner" },
    raw: true,
  });
  await models.UserOrganisationRoles.create({
    organisation_id: org.id,
    user_id: owner.id,
    role_id: ownerRole.id,
  });

  const freq = await models.TimesheetSubmissionFrequencies.findOne({
    where: { code: "by-pay-cycle" },
    raw: true,
  });
  await models.OrganisationSettings.create({
    organisation_id: org.id,
    key: "timesheet_submission_frequency",
    value: String(freq.id),
  });

  const weekly = await models.PayCycles.findOne({
    where: { code: "WEEKLY" },
    raw: true,
  });
  const startDate = moment().startOf("isoWeek").format("YYYY-MM-DD");
  const endDate = await SystemFunction.getPayrollEndDateByPayCycleType(
    "WEEKLY",
    startDate,
  );
  const defaultCal = await models.PayrollCalendars.create({
    organisation_id: org.id,
    name: "Default Weekly",
    pay_cycle_id: weekly.id,
    start_date: startDate,
    end_date: endDate,
    first_payment_date: moment(startDate).add(7, "days").format("YYYY-MM-DD"),
    default: true,
    created_at: now,
    created_by: owner.id,
    updated_at: now,
    updated_by: owner.id,
  });

  await models.HolidayCalendars.create({
    organisation_id: org.id,
    name: "Republic Day",
    date: `${moment().year()}-01-26`,
    created_at: now,
    created_by: owner.id,
    updated_at: now,
    updated_by: owner.id,
  });

  const ownerEmployee = await organisationService.createOrgAdminEmployee(
    org.id,
    owner,
    null,
    { payrollCalendarId: defaultCal.id },
  );

  return { org, defaultCal, ownerEmployee, ownerRole };
}

async function seedPayrollCalendars(org, owner) {
  log("Phase 8 — Payroll calendars");
  const now = moment().utc().format();
  const cycles = await models.PayCycles.findAll({ raw: true });
  const wanted = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"];
  const created = [];
  for (const code of wanted) {
    const cycle = cycles.find((c) => c.code === code);
    if (!code || !cycle) continue;
    const existing = await models.PayrollCalendars.findOne({
      where: { organisation_id: org.id, pay_cycle_id: cycle.id },
    });
    if (existing && code === "WEEKLY") {
      created.push(existing);
      continue;
    }
    if (existing) {
      created.push(existing);
      continue;
    }
    const start = moment().startOf("month").format("YYYY-MM-DD");
    const end = await SystemFunction.getPayrollEndDateByPayCycleType(
      code,
      start,
    );
    const row = await models.PayrollCalendars.create({
      organisation_id: org.id,
      name: `${cycle.name} Calendar`,
      pay_cycle_id: cycle.id,
      start_date: start,
      end_date: end,
      first_payment_date: moment(start).add(14, "days").format("YYYY-MM-DD"),
      default: false,
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });
    created.push(row);
    // Verify end-date calculation
    const expected = await SystemFunction.getPayrollEndDateByPayCycleType(
      code,
      start,
    );
    if (row.end_date !== expected) {
      fail(`Payroll end date ${code}`, `${row.end_date} != ${expected}`);
    } else {
      pass(`Payroll period ${code}`, `${start} → ${row.end_date}`);
    }
  }
  return created;
}

async function seedHolidays(org, owner) {
  log("Phase 9 — Holiday calendar");
  const now = moment().utc().format();
  const year = moment().year();
  const holidays = [
    { name: "Republic Day", date: `${year}-01-26` },
    { name: "Holi", date: `${year}-03-14` },
    { name: "Independence Day", date: `${year}-08-15` },
    { name: "Gandhi Jayanti", date: `${year}-10-02` },
    { name: "Diwali", date: `${year}-10-20` },
    { name: "Christmas", date: `${year}-12-25` },
    { name: "Siliguri Local Fair Day", date: `${year}-11-15` },
  ];
  for (const h of holidays) {
    const exists = await models.HolidayCalendars.findOne({
      where: { organisation_id: org.id, date: h.date },
    });
    if (exists) continue;
    await models.HolidayCalendars.create({
      organisation_id: org.id,
      name: h.name,
      date: h.date,
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });
  }
  pass("Holiday calendars seeded", `${holidays.length} entries`);
}

async function seedEmployeesAndInvitations(org, owner, usersByKey, calendars) {
  log("Phase 3–5 — Employees, invitations, roles");
  const now = moment().utc().format();
  const roles = Object.fromEntries(
    (await models.OrganisationRoles.findAll({ raw: true })).map((r) => [
      r.code,
      r,
    ]),
  );
  const invitedStatus = await models.InvitationStatus.findOne({
    where: { code: "invited" },
    raw: true,
  });
  const acceptStatus = await models.InvitationStatus.findOne({
    where: { code: "accept" },
    raw: true,
  });
  const fullTime = await models.EmploymentTypes.findOne({
    where: { code: "FULLTIME" },
    raw: true,
  });
  const weeklyCal =
    calendars.find((c) => c.name?.includes("Weekly") || c.default) ||
    calendars[0];

  const employeesByKey = { owner: null };

  for (const def of DEMO_USERS) {
    const user = usersByKey[def.key];
    if (def.role === "owner") {
      const emp = await models.Employees.findOne({
        where: { user_id: user.id, organisation_id: org.id },
      });
      employeesByKey.owner = emp;
      continue;
    }

    const emp = await models.Employees.create({
      user_id: user.id,
      organisation_id: org.id,
      preferred_name: def.first_name,
      phone_number: def.phone_number,
      phone_country_code: "+91",
      phone_country_iso: "IN",
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });
    employeesByKey[def.key] = emp;

    await models.EmployeeAddress.create({
      organisation_id: org.id,
      employee_id: emp.id,
      address_line_1: "Sevoke Road",
      city: "Siliguri",
      state_region_province: "West Bengal",
      postal_code: "734001",
      country: "India",
      country_code: "IN",
      formatted_address: "Sevoke Road, Siliguri, West Bengal, India",
    });

    await models.EmployeeWages.create({
      organisation_id: org.id,
      employee_id: emp.id,
      start_date: moment().subtract(30, "days").format("YYYY-MM-DD"),
      payroll_calendar_id: weeklyCal.id,
      employment_type_id: fullTime?.id || null,
      pay_type: "HOURLY",
      currency: "INR",
      hourly_rate_exc_super: def.hourly_rate,
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });

    await models.EmployeePayrolls.create({
      organisation_id: org.id,
      employee_id: emp.id,
      payment_method: "BANK_TRANSFER",
      account_holder_name: `${def.first_name} ${def.last_name}`,
      bank_name: "State Bank of India",
      bank_account_number: `12${String(emp.id).padStart(8, "0")}`,
      ifsc_code: "SBIN0001234",
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });

    const token = crypto.randomBytes(24).toString("hex");
    const invitedAt = moment().subtract(3, "days").toDate();
    const invitation = await models.EmployeeInvitations.create({
      user_id: user.id,
      employee_id: emp.id,
      organisation_id: org.id,
      email: def.email,
      invitation_token: token,
      organisation_role_id: roles[def.role].id,
      status_id: invitedStatus.id,
      invited_at: invitedAt,
      expire_at: moment(invitedAt).add(14, "days").toDate(),
    });

    // Simulate email send
    await models.EmailSendLogs.create({
      subject: `Invitation to join ${DEMO_ORG.name}`,
      template: "employee-invitation",
      body: `Invite token ${token} for ${def.email}`,
      email_to: def.email,
      sent_by: String(owner.id),
      sent_at: invitedAt,
    });

    // Accept invitation
    await invitation.update({ status_id: acceptStatus.id, user_id: user.id });
    await models.UserOrganisationRoles.findOrCreate({
      where: { user_id: user.id, organisation_id: org.id },
      defaults: {
        user_id: user.id,
        organisation_id: org.id,
        role_id: roles[def.role].id,
      },
    });

    await models.EmailSendLogs.create({
      subject: `Invitation accepted — ${def.email}`,
      template: "employee-invitation-accepted",
      body: `Status invited → accept for employee ${emp.id}`,
      email_to: def.email,
      sent_by: "system",
      sent_at: moment().subtract(2, "days").toDate(),
    });

    pass(`Employee + invitation accepted`, `${def.key} (${def.role})`);
  }

  return employeesByKey;
}

async function seedCustomersAndJobs(org, owner) {
  log("Phase 6–7 — Customers & jobs");
  const now = moment().utc().format();
  const customersSpec = [
    {
      name: "Teesta Valley Tea Co.",
      contact_name: "Amit Sharma",
      contact_email: "amit@teestavalley.demo",
      contact_phone_number: "9800111222",
      hourly_rate: 450,
    },
    {
      name: "Siliguri Retail Mart Pvt Ltd",
      contact_name: "Priya Das",
      contact_email: "priya@srmart.demo",
      contact_phone_number: "9800333444",
      hourly_rate: 380,
    },
    {
      name: "North Bengal Logistics",
      contact_name: "Rakesh Ghosh",
      contact_email: "rakesh@nblogistics.demo",
      contact_phone_number: "9800555666",
      hourly_rate: 420,
    },
    {
      name: "Kanchenjunga Hospitality",
      contact_name: "Sneha Roy",
      contact_email: "sneha@kanchenjunga.demo",
      contact_phone_number: "9800777888",
      hourly_rate: 500,
    },
  ];

  const customers = [];
  for (const c of customersSpec) {
    const row = await models.Customers.create({
      organisation_id: org.id,
      name: c.name,
      abn: null,
      contact_name: c.contact_name,
      contact_email: c.contact_email,
      contact_phone_number: c.contact_phone_number,
      contact_phone_country_code: "+91",
      contact_phone_country_iso: "IN",
      hourly_rate: c.hourly_rate,
      currency: "INR",
      city: "Siliguri",
      state_region_province: "West Bengal",
      country: "India",
      country_code: "IN",
      formatted_address: `${c.name}, Siliguri, West Bengal, India`,
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });
    customers.push(row);
  }

  const jobs = [];
  for (let i = 0; i < SILIGURI_SITES.length; i++) {
    const site = SILIGURI_SITES[i];
    const customer = customers[i % customers.length];
    const job = await models.Jobs.create({
      organisation_id: org.id,
      name: site.name,
      customer_id: customer.id,
      radius: site.radius,
      site_contact_name: customer.contact_name,
      site_contact_email: customer.contact_email,
      site_contact_phone_number: customer.contact_phone_number,
      site_contact_phone_country_code: "+91",
      site_contact_phone_country_iso: "IN",
      created_at: now,
      created_by: owner.id,
      updated_at: now,
      updated_by: owner.id,
    });
    await models.JobAddress.create({
      organisation_id: org.id,
      job_id: job.id,
      address_line_1: site.name,
      city: "Siliguri",
      state_region_province: "West Bengal",
      postal_code: "734001",
      country: "India",
      country_code: "IN",
      formatted_address: `${site.name}, Siliguri, West Bengal, India`,
      latitude: site.lat,
      longitude: site.lng,
    });
    jobs.push({ ...job.toJSON(), _site: site });
  }
  pass("Customers & jobs", `${customers.length} customers, ${jobs.length} jobs`);
  return { customers, jobs };
}

function hoursBetween(start, end) {
  const s = moment(start, "HH:mm:ss");
  const e = moment(end, "HH:mm:ss");
  return Number(((e.diff(s, "minutes") || 0) / 60).toFixed(2));
}

async function seedTimesheets(org, owner, employeesByKey, usersByKey, jobs) {
  log("Phase 10–13 — Timesheets, tasks, activity, geofence events");
  const now = moment().utc().format();
  const statuses = Object.fromEntries(
    (await models.TimesheetStatus.findAll({ raw: true })).map((s) => [
      s.code,
      s,
    ]),
  );
  const activityTypes = Object.fromEntries(
    (await models.TimesheetActivityTypes.findAll({ raw: true })).map((t) => [
      t.code,
      t,
    ]),
  );

  const periodStart = moment().startOf("isoWeek").subtract(1, "week");
  const periodEnd = periodStart.clone().add(6, "days");
  const statusPlan = {
    owner: "approved",
    moderator: "submitted",
    manager: "draft",
    staff1: "approved",
    staff2: "rejected",
  };

  const unread = await models.NotificationStatus.findOne({
    where: { code: "unread" },
    raw: true,
  });

  for (const def of DEMO_USERS) {
    const emp = employeesByKey[def.key];
    const user = usersByKey[def.key];
    if (!emp || !user) continue;
    const statusCode = statusPlan[def.key] || "draft";
    const jobA = jobs[def.key === "staff2" ? 1 : 0];
    const jobB = jobs[(jobs.length - 1 - DEMO_USERS.indexOf(def)) % jobs.length];

    const timesheet = await models.Timesheets.create({
      organisation_id: org.id,
      employee_id: emp.id,
      code: `TS-${org.code}-${emp.id}-${periodStart.format("YYYYMMDD")}`,
      payroll_calendar_id: (
        await models.EmployeeWages.findOne({
          where: { employee_id: emp.id },
          raw: true,
        })
      )?.payroll_calendar_id,
      job_id: jobA.id,
      period_start_date: periodStart.format("YYYY-MM-DD"),
      period_end_date: periodEnd.format("YYYY-MM-DD"),
      status_id: statuses[statusCode].id,
      created_at: now,
      created_by: owner.id,
    });

    await models.TimesheetJobs.bulkCreate([
      {
        timesheet_id: timesheet.id,
        job_id: jobA.id,
        organisation_id: org.id,
      },
      {
        timesheet_id: timesheet.id,
        job_id: jobB.id,
        organisation_id: org.id,
      },
    ]);

    for (let d = 0; d < 5; d++) {
      const date = periodStart.clone().add(d, "days");
      if (date.isoWeekday() > 5) continue;
      const day = await models.TimesheetDays.create({
        organisation_id: org.id,
        employee_id: emp.id,
        timesheet_id: timesheet.id,
        date: date.format("YYYY-MM-DD"),
        day_of_week: date.isoWeekday() % 7,
        is_public_holiday: false,
        is_weekend: false,
        total_hours: 8.5,
        created_at: now,
        created_by: user.id,
        updated_at: now,
        updated_by: user.id,
      });

      const late = d === 1;
      const early = d === 3;
      const startWork = late ? "09:25:00" : "09:00:00";
      const endWork = early ? "16:30:00" : "17:30:00";
      const segments = [
        {
          start: "08:40:00",
          end: startWork,
          is_travel: true,
          is_break: false,
          job_id: jobA.id,
          remarks: "Travel to site",
        },
        {
          start: startWork,
          end: "12:00:00",
          is_travel: false,
          is_break: false,
          job_id: jobA.id,
          remarks: late ? "Late arrival" : "Morning work",
        },
        {
          start: "12:00:00",
          end: "12:30:00",
          is_travel: false,
          is_break: true,
          job_id: null,
          remarks: d === 2 ? "Missed full lunch (short)" : "Lunch",
        },
        {
          start: "12:30:00",
          end: "13:00:00",
          is_travel: false,
          is_break: true,
          job_id: null,
          remarks: "Tea break",
        },
        {
          start: "13:00:00",
          end: endWork,
          is_travel: false,
          is_break: false,
          job_id: jobB.id,
          remarks: early ? "Early finish" : "Afternoon work / OT window",
        },
        {
          start: endWork,
          end: moment(endWork, "HH:mm:ss")
            .add(25, "minutes")
            .format("HH:mm:ss"),
          is_travel: true,
          is_break: false,
          job_id: jobB.id,
          remarks: "Travel back",
        },
      ];

      let dayHours = 0;
      for (const seg of segments) {
        const th = hoursBetween(seg.start, seg.end);
        if (!seg.is_break && !seg.is_travel) dayHours += th;
        const task = await models.TimesheetDayTasks.create({
          organisation_id: org.id,
          employee_id: emp.id,
          timesheet_id: timesheet.id,
          timesheet_day_id: day.id,
          job_id: seg.job_id,
          start_time: seg.start,
          end_time: seg.end,
          total_hours: th,
          is_break: seg.is_break,
          is_travel: seg.is_travel,
          source: "demo-seed",
          remarks: seg.remarks,
          created_at: now,
          created_by: user.id,
          updated_at: now,
          updated_by: user.id,
        });

        const typeCode = seg.is_break
          ? "break"
          : seg.is_travel
            ? "travel"
            : "working";
        const startAt = moment(
          `${date.format("YYYY-MM-DD")} ${seg.start}`,
          "YYYY-MM-DD HH:mm:ss",
        );
        const endAt = moment(
          `${date.format("YYYY-MM-DD")} ${seg.end}`,
          "YYYY-MM-DD HH:mm:ss",
        );
        const jitter = (Math.random() - 0.5) * 0.002;
        const site = jobA._site || SILIGURI_SITES[0];
        const logRow = await models.TimesheetActivityLogs.create({
          organisation_id: org.id,
          user_id: user.id,
          timesheet_day_id: day.id,
          latitude: site.lat + jitter,
          longitude: site.lng + jitter,
          start_at: startAt.toDate(),
          end_at: endAt.toDate(),
          type_id: activityTypes[typeCode].id,
          track_at: startAt.toDate(),
        });

        await models.TimesheetTaskActivityPairs.create({
          organisation_id: org.id,
          employee_id: emp.id,
          timesheet_id: timesheet.id,
          timesheet_day_id: day.id,
          timesheet_day_task_id: task.id,
          timesheet_activity_log_start_id: logRow.id,
          timesheet_activity_log_end_id: logRow.id,
        });

        if (!seg.is_break) {
          await models.GeofenceEvents.create({
            organisation_id: org.id,
            user_id: user.id,
            timesheet_activity_log_id: logRow.id,
            job_id: seg.job_id || jobA.id,
            action: seg.is_travel ? "EXIT" : "ENTER",
            track_at: startAt.toDate(),
          });
        }
      }

      await day.update({ total_hours: Number(dayHours.toFixed(2)) });
    }

    if (unread) {
      await models.Notifications.create({
        user_id: user.id,
        title: `Timesheet ${statusCode}`,
        body: `Your timesheet for ${periodStart.format("DD MMM")} is ${statusCode}.`,
        url: `/org/${org.code}/timesheets`,
        status_id: unread.id,
        sent_at: now,
        created_at: now,
        created_by: owner.id,
      });
    }

    pass(`Timesheet seeded`, `${def.key} → ${statusCode}`);
  }
}

async function phase14Integrity(org) {
  log("Phase 14 — Data integrity validation");

  const [dupUsers] = await db.query(`
    SELECT email, COUNT(*) c FROM users GROUP BY email HAVING c > 1
  `);
  if (dupUsers.length) fail("Duplicate users", JSON.stringify(dupUsers));
  else pass("No duplicate users");

  const [dupEmp] = await db.query(`
    SELECT user_id, organisation_id, COUNT(*) c FROM employees
    WHERE user_id IS NOT NULL
    GROUP BY user_id, organisation_id HAVING c > 1
  `);
  if (dupEmp.length) fail("Duplicate employees", JSON.stringify(dupEmp));
  else pass("No duplicate employees");

  const [dupUor] = await db.query(`
    SELECT user_id, organisation_id, COUNT(*) c FROM user_organisation_roles
    GROUP BY user_id, organisation_id HAVING c > 1
  `);
  if (dupUor.length) fail("Duplicate memberships", JSON.stringify(dupUor));
  else pass("No duplicate memberships");

  const [orphanEmp] = await db.query(`
    SELECT e.id FROM employees e
    LEFT JOIN organisations o ON o.id = e.organisation_id
    WHERE o.id IS NULL
  `);
  if (orphanEmp.length) fail("Orphan employees", JSON.stringify(orphanEmp));
  else pass("No orphan employees");

  const [orphanTasks] = await db.query(`
    SELECT t.id FROM timesheet_day_tasks t
    LEFT JOIN timesheet_days d ON d.id = t.timesheet_day_id
    WHERE d.id IS NULL
  `);
  if (orphanTasks.length)
    fail("Orphan day tasks", JSON.stringify(orphanTasks));
  else pass("No orphan timesheet day tasks");

  const missingWage = await models.Employees.unscoped().findAll({
    where: { organisation_id: org.id },
    include: [
      {
        model: models.EmployeeWages,
        as: "wage",
        required: false,
      },
    ],
  });
  const withoutWage = missingWage.filter((e) => !e.wage);
  if (withoutWage.length)
    fail(
      "Employees missing wage",
      withoutWage.map((e) => e.id).join(","),
    );
  else pass("All employees have wage profile");

  // ACL spot-check
  for (const role of ["owner", "moderator", "manager", "staff"]) {
    const acl = await Acl.organisationAcl(role);
    if (!acl) {
      fail(`ACL missing for ${role}`);
      continue;
    }
    if (role === "owner" && !acl.customer.delete)
      fail("Owner should delete customers");
    if (role === "staff" && acl.employee.create)
      fail("Staff should not create employees");
    if (role === "manager" && !acl.timesheetManagement.edit)
      fail("Manager should manage timesheets");
    pass(`ACL matrix ${role}`);
  }
}

async function writeReport(meta) {
  const lines = [
    `# Demo Environment QA Report`,
    ``,
    `Generated: ${moment().format("YYYY-MM-DD HH:mm:ss Z")}`,
    ``,
    `## Summary`,
    ``,
    `- Passed: **${passed.length}**`,
    `- Failed: **${failures.length}**`,
    `- Warnings: **${warnings.length}**`,
    ``,
    `## Demo organisation`,
    ``,
    `- Name: ${meta.orgName}`,
    `- Code: ${meta.orgCode}`,
    `- Users: ${DEMO_USERS.map((u) => u.email).join(", ")}`,
    ``,
    `## Schema notes (intentional limitations)`,
    ``,
    `- No \`geofences\` definition table — Siliguri sites stored as jobs + \`job_address\` coordinates; movement logged in \`geofence_events\`.`,
    `- No dedicated \`employee_profiles\` / \`audit_logs\` tables — profile = employees + address + wage + payroll; audit ≈ \`email_send_logs\` / activity logs.`,
    `- No job↔staff assignment table (management groups retired) — assignment is via timesheets + jobs.`,
    `- Customers have no status/notes columns in schema.`,
    ``,
    `## Passed`,
    ``,
    ...passed.map((p) => `- ✅ ${p.name}${p.detail ? ` — ${p.detail}` : ""}`),
    ``,
    `## Failed`,
    ``,
    ...(failures.length
      ? failures.map((f) => `- ❌ ${f.name}${f.detail ? ` — ${f.detail}` : ""}`)
      : [`- None`]),
    ``,
    `## Warnings`,
    ``,
    ...(warnings.length
      ? warnings.map((w) => `- ⚠️ ${w.name}${w.detail ? ` — ${w.detail}` : ""}`)
      : [`- None`]),
    ``,
    `## Suggested follow-ups`,
    ``,
    `- Add Jest/Vitest CI job for \`npm test\` (node:test suites under \`backend/tests\`).`,
    `- Optional: add a real geofence definitions table if product requires reusable polygons beyond job radius.`,
    `- Run web/mobile smoke against this org code after Firebase login with the seeded UIDs.`,
    ``,
  ];
  fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
  log(`QA report written → ${REPORT_PATH}`);
}

async function main() {
  const started = Date.now();
  log("Starting demo reset & seed");
  await ensureLookups();
  await phase1Reset();

  const orgAdminRole = await models.SystemRoles.findOne({
    where: { code: "org-admin" },
    raw: true,
  });
  if (!orgAdminRole) throw new Error("system role org-admin missing");

  log("Phase 3 — Create demo users");
  const usersByKey = {};
  for (const def of DEMO_USERS) {
    usersByKey[def.key] = await createUser(def, orgAdminRole.id);
    pass(`User created`, def.email);
  }

  const owner = usersByKey.owner;
  const { org, defaultCal, ownerEmployee } = await seedOrganisation(owner);
  await phase2AuditSignup(owner, org, defaultCal.id);

  const calendars = await seedPayrollCalendars(org, owner);
  await seedHolidays(org, owner);
  const employeesByKey = await seedEmployeesAndInvitations(
    org,
    owner,
    usersByKey,
    calendars.length ? calendars : [defaultCal],
  );
  employeesByKey.owner = ownerEmployee;

  const { jobs } = await seedCustomersAndJobs(org, owner);
  await seedTimesheets(org, owner, employeesByKey, usersByKey, jobs);
  await phase14Integrity(org);

  await writeReport({ orgName: org.name, orgCode: org.code });

  log(
    `Done in ${((Date.now() - started) / 1000).toFixed(1)}s — failures=${failures.length} warnings=${warnings.length}`,
  );
  log(`Login as ${owner.email} → org code ${org.code}`);

  if (failures.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.close();
    } catch {
      /* ignore */
    }
  });
