import { Op, col } from "sequelize";
import moment from "moment";
import models from "../models/index.js";
import organisationService from "./organisation.service.js";
import timsheetService from "./timsheet.service.js";
import payoutService from "./payout.service.js";
import { TimesheetConfig } from "../class/timesheet.config.js";
import redisUtils from "../utils/redis.utils.js";
import { resolveOrganisationDisplayCurrency } from "../utils/currency.utils.js";
import currencyService from "./currency.service.js";
import {
  mapInvitation,
  mapJobOption,
  mapNamedIdList,
  mapNotification,
  mapOrganisationMembership,
} from "../mappers/screen.mapper.js";

const {
  Organisations,
  EmployeeInvitations,
  InvitationStatus,
  OrganisationRoles,
  Employees,
  Users,
  Notifications,
  NotificationStatus,
  EmploymentTypes,
  PayrollCalendars,
  Jobs,
  Timesheets,
  TimesheetStatus,
  TimesheetDays,
  Payouts,
} = models;

async function listOrganisationsForUser(userId, { limit = 50 } = {}) {
  const organisations = await Organisations.scope({
    method: ["withUser", userId],
  }).findAll({
    limit,
    order: [["id", "asc"]],
    raw: false,
    nest: true,
  });
  return organisations.map(mapOrganisationMembership);
}

async function listInvitationsForUser(userId) {
  const rows = await EmployeeInvitations.findAll({
    where: {
      user_id: userId,
      "$status.code$": "invited",
    },
    include: [
      {
        model: InvitationStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
      {
        model: Organisations,
        as: "organisation",
        attributes: ["id", "name"],
      },
      {
        model: OrganisationRoles,
        as: "role",
        attributes: ["id", "name", "code"],
      },
      {
        model: Employees.unscoped(),
        as: "employee",
        attributes: ["id", "created_by"],
        include: [
          {
            model: Users,
            as: "creator",
            attributes: [
              "id",
              "first_name",
              "middle_name",
              "last_name",
              "full_name",
            ],
          },
        ],
      },
    ],
    raw: false,
    nest: true,
  });
  return rows.map(mapInvitation);
}

async function listNotificationsForUser(userId, { limit = 20 } = {}) {
  const { rows } = await Notifications.findAndCountAll({
    attributes: ["id", "title", "body", "url", "sent_at"],
    where: { user_id: userId },
    include: [
      {
        model: NotificationStatus,
        as: "status",
        attributes: ["id", "name", "code"],
        on: { id: { [Op.eq]: col("Notifications.status_id") } },
        required: true,
      },
    ],
    limit,
    order: [["sent_at", "desc"]],
    raw: false,
    nest: true,
    subQuery: false,
  });

  const unread_count = await Notifications.count({
    where: { user_id: userId },
    include: [
      {
        model: NotificationStatus,
        as: "status",
        on: { id: { [Op.eq]: col("Notifications.status_id") } },
        required: true,
        where: { code: "unread" },
      },
    ],
  });

  return {
    items: rows.map(mapNotification),
    unread_count,
  };
}

/**
 * Org shell: organisation + organisations list + notifications in one payload.
 * Resolves org by code (deep-link safe; no org-id header required).
 */
export async function getOrgBootstrap(user, orgCode) {
  if (!orgCode) {
    return { success: false, code: 400, message: "org_code is required" };
  }

  const cacheKey = `organisation:${orgCode}:${user.id}`;
  let organisation = await redisUtils.getCache(cacheKey);
  if (!organisation) {
    const response = await organisationService.getOrganisation(
      user.id,
      orgCode,
    );
    if (!response.success) {
      return {
        success: false,
        code: 400,
        message: response.message || "Invalid organisation",
      };
    }
    organisation = response.data;
    await redisUtils.setCache(cacheKey, organisation);
  }

  const [organisations, notifications] = await Promise.all([
    listOrganisationsForUser(user.id, { limit: 50 }),
    listNotificationsForUser(user.id, { limit: 20 }),
  ]);

  return {
    success: true,
    data: {
      organisation,
      organisations,
      notifications,
    },
  };
}

/** Home: organisations + pending invitations. */
export async function getHomeBootstrap(user) {
  const [organisations, invitations] = await Promise.all([
    listOrganisationsForUser(user.id, { limit: 50 }),
    listInvitationsForUser(user.id),
  ]);
  return {
    success: true,
    data: { organisations, invitations },
  };
}

/** Employee create/edit form lookups in one response. */
export async function getEmployeeFormLookups(organisation) {
  const roleCode = organisation?.role?.code;
  const roleWhere = {
    code: { [Op.notIn]: ["owner"] },
  };
  if (roleCode === "moderator") {
    roleWhere.code[Op.notIn].push("moderator");
  }

  const [roles, employment_types, payroll_calendars] = await Promise.all([
    OrganisationRoles.findAll({
      where: roleWhere,
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    EmploymentTypes.findAll({
      where: {
        code: { [Op.notIn]: ["CONTRACT", "contract"] },
      },
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    PayrollCalendars.findAll({
      where: { organisation_id: organisation.id },
      attributes: ["id", "name"],
      order: [["name", "asc"]],
      raw: true,
    }),
  ]);

  return {
    success: true,
    data: {
      roles: mapNamedIdList(roles),
      organisation_roles: mapNamedIdList(roles),
      employment_types: mapNamedIdList(employment_types),
      payroll_calendars: mapNamedIdList(payroll_calendars),
    },
  };
}

async function listAvailableJobs(organisation) {
  const whereCondition = { organisation_id: organisation.id };

  const jobs = await Jobs.scope({
    method: ["withEmployee", {}],
  }).findAll({
    where: whereCondition,
    order: [["name", "asc"]],
    limit: 500,
    raw: false,
    nest: true,
  });

  return jobs.map(mapJobOption);
}

/** Managers see all employees in the organisation (org-wide scoping). */
async function resolveManagementStaffIds(organisation) {
  if (organisation?.role?.code !== "manager") return null;
  const employees = await Employees.unscoped().findAll({
    where: {
      organisation_id: organisation.id,
      ...(organisation?.employee?.id
        ? { id: { [Op.ne]: organisation.employee.id } }
        : {}),
    },
    attributes: ["id"],
    raw: true,
  });
  return employees.map((e) => e.id);
}

/**
 * Timesheet day editor: day detail + slim available jobs.
 */
export async function getTimesheetDayEditor(
  user,
  organisation,
  { mode, timesheet_day_id, employee_id },
) {
  const isManagement = mode === "management";

  if (isManagement) {
    if (!organisation.acl?.timesheetManagement?.view) {
      return { success: false, code: 403, message: "Access denied" };
    }
  } else if (!organisation.acl?.timesheet?.view) {
    return { success: false, code: 403, message: "Access denied" };
  }

  let employeeId = organisation?.employee?.id;
  let employeeTimezone = user?.timezone?.timezone;

  if (isManagement) {
    if (!employee_id) {
      return {
        success: false,
        code: 400,
        message: "employee_id is required for management mode",
      };
    }
    employeeId = employee_id;
    const employeeJson = await Employees.scope("defaultScope").findOne({
      where: {
        organisation_id: organisation.id,
        id: employee_id,
      },
    });
    const employee = employeeJson?.toJSON() || null;
    if (!employee) {
      return { success: false, code: 404, message: "Employee not found!" };
    }
    employeeTimezone = employee?.details?.user?.timezone?.timezone;
  } else if (!employeeId) {
    return {
      success: false,
      code: 400,
      message: "No employee profile linked to this organisation",
    };
  }

  const whereCondition = {
    organisation_id: organisation.id,
    employee_id: employeeId,
    id: timesheet_day_id,
  };

  const response = await timsheetService.getTimesheetDay(
    whereCondition,
    employeeTimezone,
  );
  if (!response.success) {
    return {
      success: false,
      code: response?.code || 500,
      message: response?.message || "Unable to fetch timesheet day",
    };
  }

  const day = response.data;
  day.permissions = await TimesheetConfig.dayTasksPermissions(
    isManagement,
    day.status?.code,
  );

  let timesheet_jobs = [];
  let timesheet_job = null;
  if (day?.timesheet_id) {
    const ts = await Timesheets.findOne({
      where: {
        id: day.timesheet_id,
        organisation_id: organisation.id,
      },
      attributes: ["id", "job_id"],
      include: [
        {
          model: Jobs,
          as: "jobs",
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Jobs,
          as: "job",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });
    const plain = ts?.toJSON?.() ?? ts;
    timesheet_jobs = Array.isArray(plain?.jobs)
      ? plain.jobs.map((j) => ({ id: j.id, name: j.name }))
      : [];
    if (!timesheet_jobs.length && plain?.job) {
      timesheet_jobs = [{ id: plain.job.id, name: plain.job.name }];
    }
    timesheet_job = timesheet_jobs[0] || null;
  }

  let available_jobs = timesheet_jobs;
  if (!available_jobs.length && organisation.acl?.job?.list) {
    available_jobs = await listAvailableJobs(organisation);
  }

  return {
    success: true,
    data: {
      ...day,
      timesheet_job,
      timesheet_jobs,
      available_jobs,
    },
  };
}

async function buildTimesheetWhereForDashboard(organisation) {
  const canManage = organisation.acl?.timesheetManagement?.list;
  const canSelf = organisation.acl?.timesheet?.list;

  if (canManage) {
    let whereCondition = { organisation_id: organisation.id };
    if (organisation.role?.code !== "owner") {
      whereCondition.employee_id = {
        [Op.ne]: organisation?.employee?.id,
      };
    }
    if (organisation.role?.code === "manager") {
      const staffIds = await resolveManagementStaffIds(organisation);
      whereCondition.employee_id = { [Op.in]: staffIds || [] };
    }
    return { whereCondition, source: "management" };
  }

  if (canSelf && organisation?.employee?.id) {
    return {
      whereCondition: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
      },
      source: "self",
    };
  }

  return { whereCondition: null, source: "none" };
}

/**
 * Org home dashboard overview — server-computed KPIs (no mock charts).
 * Role-scoped timesheet + payout analytics.
 */
export async function getDashboardOverview(user, organisation) {
  const { whereCondition, source } =
    await buildTimesheetWhereForDashboard(organisation);

  if (!whereCondition) {
    const displayCurrency = resolveOrganisationDisplayCurrency(organisation);
    const empty = emptyDashboard(source, organisation?.role?.code);
    empty.display_currency = displayCurrency;
    if (organisation.acl?.payout?.list) {
      const payoutStats = await payoutService.dashboardPayoutStats(
        organisation,
        null,
        { displayCurrency },
      );
      empty.payroll_trend = payoutStats.monthly_payroll_trend || [];
      empty.payout_status_donut = payoutStats.status_distribution || [];
      empty.kpis.payroll_this_month = payoutStats.paid_amount_month || 0;
      empty.kpis.pending_payout_amount = payoutStats.pending_amount || 0;
      empty.kpis.pending_payouts =
        (payoutStats.ready || 0) + (payoutStats.pending_approval || 0);
      empty.kpis.paid_payouts = payoutStats.paid || 0;
    }
    return {
      success: true,
      data: empty,
    };
  }

  const timesheets = await Timesheets.unscoped().findAll({
    where: whereCondition,
    attributes: [
      "id",
      "code",
      "period_start_date",
      "period_end_date",
      "created_at",
      "employee_id",
    ],
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
    ],
    order: [["created_at", "desc"]],
    limit: 500,
    raw: false,
    nest: true,
  });

  const statusCounts = new Map();
  for (const row of timesheets) {
    const plain = row.toJSON ? row.toJSON() : row;
    const code = plain.status?.code || "unknown";
    const name = plain.status?.name || code;
    const prev = statusCounts.get(code) || { code, name, count: 0 };
    prev.count += 1;
    statusCounts.set(code, prev);
  }

  const approved = statusCounts.get("approved")?.count || 0;
  const draft = statusCounts.get("draft")?.count || 0;
  const submitted = statusCounts.get("submitted")?.count || 0;
  const rejected = statusCounts.get("rejected")?.count || 0;
  const total = timesheets.length;
  const decided = approved + rejected;
  const approval_rate_pct =
    decided > 0 ? Math.round((approved / decided) * 100) : 0;

  const timesheetIds = timesheets.map((t) => t.id);
  const approvedIds = timesheets
    .filter((t) => {
      const plain = t.toJSON ? t.toJSON() : t;
      return plain.status?.code === "approved";
    })
    .map((t) => t.id);
  const pendingIds = timesheets
    .filter((t) => {
      const plain = t.toJSON ? t.toJSON() : t;
      return (
        plain.status?.code === "draft" || plain.status?.code === "submitted"
      );
    })
    .map((t) => t.id);

  const weekStart = moment().startOf("isoWeek");
  const weekEnd = moment().endOf("isoWeek");
  const monthStart = moment().startOf("month");
  const monthEnd = moment().endOf("month");
  const trendStart = moment().subtract(5, "months").startOf("month");

  let dayRows = [];
  if (timesheetIds.length > 0) {
    dayRows = await TimesheetDays.findAll({
      where: {
        timesheet_id: { [Op.in]: timesheetIds },
        date: {
          [Op.between]: [
            trendStart.format("YYYY-MM-DD"),
            weekEnd.format("YYYY-MM-DD"),
          ],
        },
      },
      attributes: [
        "date",
        "timesheet_id",
        "total_working_hours_in_decimal",
        "is_public_holiday",
      ],
      raw: true,
    });
  }

  const weeklyMap = {
    Mon: { completed: 0, pending: 0 },
    Tue: { completed: 0, pending: 0 },
    Wed: { completed: 0, pending: 0 },
    Thu: { completed: 0, pending: 0 },
    Fri: { completed: 0, pending: 0 },
    Sat: { completed: 0, pending: 0 },
    Sun: { completed: 0, pending: 0 },
  };
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const day of dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(weekStart, weekEnd, "day", "[]")) continue;
    const label = dayNames[m.day()];
    const hours = Number(day.total_working_hours_in_decimal) || 0;
    if (hours > 0) weeklyMap[label].completed += 1;
    else weeklyMap[label].pending += 1;
  }

  const weekly_progress = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day) => ({
      day,
      completed: weeklyMap[day].completed,
      pending: weeklyMap[day].pending,
    }),
  );

  const weeksInMonth = {};
  for (const day of dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(monthStart, monthEnd, "day", "[]")) continue;
    const weekNum = Math.ceil(m.date() / 7);
    const key = `W${weekNum}`;
    if (!weeksInMonth[key]) weeksInMonth[key] = { done: 0, total: 0 };
    weeksInMonth[key].total += 1;
    if ((Number(day.total_working_hours_in_decimal) || 0) > 0) {
      weeksInMonth[key].done += 1;
    }
  }
  const monthly_progress = Object.keys(weeksInMonth)
    .sort()
    .map((week) => ({
      week,
      progress_pct:
        weeksInMonth[week].total > 0
          ? Math.round(
              (weeksInMonth[week].done / weeksInMonth[week].total) * 100,
            )
          : 0,
    }));

  const trendBuckets = {};
  for (let i = 5; i >= 0; i -= 1) {
    const m = moment().subtract(i, "months");
    trendBuckets[m.format("YYYY-MM")] = {
      label: m.format("MMM"),
      value: 0,
    };
  }
  for (const ts of timesheets) {
    const plain = ts.toJSON ? ts.toJSON() : ts;
    if (plain.status?.code !== "approved") continue;
    const key = moment(plain.period_end_date || plain.created_at).format(
      "YYYY-MM",
    );
    if (trendBuckets[key]) trendBuckets[key].value += 1;
  }
  const productivity_trend = Object.values(trendBuckets);

  let worked_hours_month = 0;
  let approved_hours_month = 0;
  let pending_hours_month = 0;
  const approvedSet = new Set(approvedIds);
  const pendingSet = new Set(pendingIds);
  for (const day of dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(monthStart, monthEnd, "day", "[]")) continue;
    const hours = Number(day.total_working_hours_in_decimal) || 0;
    worked_hours_month += hours;
    if (approvedSet.has(day.timesheet_id)) approved_hours_month += hours;
    if (pendingSet.has(day.timesheet_id)) pending_hours_month += hours;
  }
  worked_hours_month = Number(worked_hours_month.toFixed(2));
  approved_hours_month = Number(approved_hours_month.toFixed(2));
  pending_hours_month = Number(pending_hours_month.toFixed(2));

  const notifications = await listNotificationsForUser(user.id, {
    limit: 8,
  }).catch(() => ({ items: [], unread_count: 0 }));

  const recent_activity = (notifications.items || []).map((n) => ({
    title: n.title || "Notification",
    meta: n.body || n.sent_at || "",
    at: n.sent_at,
    url: n.url || null,
  }));

  const team_activity = [
    { name: "Timesheets", count: total },
    { name: "Approvals", count: approved },
    { name: "Submitted", count: submitted },
    { name: "Draft", count: draft },
  ];

  const pendingSubmitted = timesheets.find((t) => {
    const plain = t.toJSON ? t.toJSON() : t;
    return plain.status?.code === "submitted";
  });

  let employeeScopeIds = null;
  if (organisation.role?.code === "staff" && organisation?.employee?.id) {
    employeeScopeIds = [Number(organisation.employee.id)];
  } else if (organisation.role?.code === "manager") {
    employeeScopeIds = await resolveManagementStaffIds(organisation);
  }

  // Org admins see reporting currency; staff see their own wage currency.
  let displayCurrency = resolveOrganisationDisplayCurrency(organisation);
  if (
    organisation.role?.code === "staff" &&
    organisation?.employee?.id
  ) {
    const { EmployeeWages } = models;
    const wage = await EmployeeWages.findOne({
      where: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
      },
      attributes: ["currency"],
      order: [["id", "DESC"]],
      raw: true,
    }).catch(() => null);
    if (wage?.currency) {
      displayCurrency = String(wage.currency).toUpperCase();
    }
  }

  let payoutStats = {
    draft: 0,
    pending_approval: 0,
    ready: 0,
    paid: 0,
    cancelled: 0,
    paid_amount_month: 0,
    pending_amount: 0,
    status_distribution: [],
    monthly_payroll_trend: [],
  };
  if (organisation.acl?.payout?.list) {
    payoutStats = await payoutService.dashboardPayoutStats(
      organisation,
      employeeScopeIds,
      { displayCurrency },
    );
  }

  let latest_payout = null;
  if (
    organisation.acl?.payout?.list &&
    organisation.role?.code === "staff" &&
    organisation?.employee?.id
  ) {
    const latest = await Payouts.findOne({
      where: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
        status: { [Op.ne]: "CANCELLED" },
      },
      order: [["id", "DESC"]],
      attributes: [
        "id",
        "payout_number",
        "status",
        "amount",
        "net_amount",
        "currency",
        "paid_at",
        "pay_date",
        "period_start_date",
        "period_end_date",
      ],
      raw: true,
    });
    latest_payout = latest || null;
    if (
      latest_payout &&
      latest_payout.currency &&
      String(latest_payout.currency).toUpperCase() !== displayCurrency
    ) {
      try {
        const converted = await currencyService.convertAmount(
          latest_payout.net_amount ?? latest_payout.amount,
          latest_payout.currency,
          displayCurrency,
        );
        latest_payout = {
          ...latest_payout,
          amount_original: latest_payout.net_amount ?? latest_payout.amount,
          currency_original: latest_payout.currency,
          net_amount: converted.amount,
          amount: converted.amount,
          currency: displayCurrency,
        };
      } catch {
        /* keep native */
      }
    }
  }

  const employeeCount =
    source === "management"
      ? await Employees.unscoped().count({
          where: {
            organisation_id: organisation.id,
            ...(employeeScopeIds
              ? { id: { [Op.in]: employeeScopeIds } }
              : {}),
          },
        })
      : organisation?.employee?.id
        ? 1
        : 0;

  return {
    success: true,
    data: {
      source,
      role: organisation?.role?.code || null,
      display_currency: displayCurrency,
      kpis: {
        approved,
        draft,
        submitted,
        rejected,
        total,
        approval_rate_pct,
        employees: employeeCount,
        worked_hours_month,
        approved_hours_month,
        pending_hours_month,
        payroll_this_month: payoutStats.paid_amount_month,
        pending_payout_amount: payoutStats.pending_amount,
        pending_payouts:
          (payoutStats.ready || 0) + (payoutStats.pending_approval || 0),
        paid_payouts: payoutStats.paid || 0,
      },
      status_donut: Array.from(statusCounts.values()),
      weekly_progress,
      monthly_progress,
      productivity_trend,
      payroll_trend: payoutStats.monthly_payroll_trend || [],
      payout_status_donut: payoutStats.status_distribution || [],
      team_activity,
      recent_activity,
      latest_payout,
      quick_links_hint: {
        has_pending_approvals: submitted > 0,
        open_timesheet_id: pendingSubmitted?.id ?? null,
      },
    },
  };
}

function emptyDashboard(source, role = null) {
  return {
    source,
    role,
    display_currency: null,
    kpis: {
      approved: 0,
      draft: 0,
      submitted: 0,
      rejected: 0,
      total: 0,
      approval_rate_pct: 0,
      employees: 0,
      worked_hours_month: 0,
      approved_hours_month: 0,
      pending_hours_month: 0,
      payroll_this_month: 0,
      pending_payout_amount: 0,
      pending_payouts: 0,
      paid_payouts: 0,
    },
    status_donut: [],
    weekly_progress: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day) => ({ day, completed: 0, pending: 0 }),
    ),
    monthly_progress: [],
    productivity_trend: [],
    payroll_trend: [],
    payout_status_donut: [],
    team_activity: [],
    recent_activity: [],
    latest_payout: null,
    quick_links_hint: {
      has_pending_approvals: false,
      open_timesheet_id: null,
    },
  };
}

export default {
  getOrgBootstrap,
  getHomeBootstrap,
  getEmployeeFormLookups,
  getTimesheetDayEditor,
  getDashboardOverview,
};
