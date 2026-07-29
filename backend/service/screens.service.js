import { Op, col } from "sequelize";
import moment from "moment";
import models from "../models/index.js";
import organisationService from "./organisation.service.js";
import timsheetService from "./timsheet.service.js";
import { TimesheetConfig } from "../class/timesheet.config.js";
import redisUtils from "../utils/redis.utils.js";
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
  Regions,
  NokRelations,
  EmploymentStatus,
  EmploymentTypes,
  TimesheetSubmissionFrequencies,
  PayrollCalendars,
  AwardRates,
  ManagementGroups,
  ManagementGroupEmployees,
  Jobs,
  Timesheets,
  TimesheetStatus,
  TimesheetDays,
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

  let groupWhere = { organisation_id: organisation.id };
  if (roleCode === "manager" || roleCode === "staff") {
    const employeeGroups = await ManagementGroupEmployees.findAll({
      where: { employee_id: organisation?.employee?.id },
      raw: true,
    });
    const groupIds = employeeGroups.map((g) => g.group_id);
    groupWhere = {
      ...groupWhere,
      [Op.or]: [{ id: { [Op.in]: groupIds } }, { default: true }],
    };
  }

  const [
    roles,
    regions,
    nok_relations,
    employment_status,
    employment_types,
    timesheet_submission_frequencies,
    payroll_calendars,
    award_rates,
    management_groups,
  ] = await Promise.all([
    OrganisationRoles.findAll({
      where: roleWhere,
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    Regions.findAll({
      where: { organisation_id: organisation.id },
      attributes: ["id", "name"],
      order: [["name", "asc"]],
      raw: true,
    }),
    NokRelations.findAll({
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    EmploymentStatus.findAll({
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    EmploymentTypes.findAll({
      attributes: ["id", "name", "code"],
      order: [["name", "asc"]],
      raw: true,
    }),
    TimesheetSubmissionFrequencies.findAll({
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
    AwardRates.findAll({
      where: { organisation_id: organisation.id },
      attributes: ["id", "name"],
      order: [["name", "asc"]],
      raw: true,
    }),
    ManagementGroups.findAll({
      where: groupWhere,
      attributes: ["id", "name"],
      order: [["name", "asc"]],
      raw: true,
    }),
  ]);

  return {
    success: true,
    data: {
      roles: mapNamedIdList(roles),
      regions: mapNamedIdList(regions),
      nok_relations: mapNamedIdList(nok_relations),
      employment_status: mapNamedIdList(employment_status),
      employment_types: mapNamedIdList(employment_types),
      timesheet_submission_frequencies: mapNamedIdList(
        timesheet_submission_frequencies,
      ),
      payroll_calendars: mapNamedIdList(payroll_calendars),
      award_rates: mapNamedIdList(award_rates),
      management_groups: mapNamedIdList(management_groups),
    },
  };
}

async function listAvailableJobs(organisation) {
  const whereCondition = { organisation_id: organisation.id };
  let employeeCondition = {};
  if (
    organisation?.role?.code === "manager" ||
    organisation?.role?.code === "staff"
  ) {
    employeeCondition = { employee_id: organisation?.employee?.id };
  }

  const jobs = await Jobs.scope({
    method: ["withEmployee", employeeCondition],
  }).findAll({
    where: whereCondition,
    order: [["name", "asc"]],
    limit: 500,
    raw: false,
    nest: true,
  });

  return jobs.map(mapJobOption);
}

async function resolveManagementStaffIds(organisation) {
  if (organisation?.role?.code !== "manager") return null;
  const managerGroups = await ManagementGroupEmployees.findAll({
    where: {
      employee_id: organisation?.employee?.id,
      is_manager: true,
    },
    raw: true,
  });
  const managerGroupIds = managerGroups.map((g) => g.group_id);
  const staffGroups = await ManagementGroupEmployees.findAll({
    where: {
      group_id: { [Op.in]: managerGroupIds },
      is_manager: false,
    },
    raw: true,
  });
  return Array.from(
    new Set(staffGroups.map((g) => g.employee_id).filter(Boolean)),
  );
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

  let available_jobs = [];
  if (organisation.acl?.job?.list) {
    available_jobs = await listAvailableJobs(organisation);
  }

  return {
    success: true,
    data: {
      ...day,
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
 */
export async function getDashboardOverview(user, organisation) {
  const { whereCondition, source } =
    await buildTimesheetWhereForDashboard(organisation);

  if (!whereCondition) {
    return {
      success: true,
      data: emptyDashboard(source),
    };
  }

  const timesheets = await Timesheets.unscoped().findAll({
    where: whereCondition,
    attributes: ["id", "code", "period_start_date", "period_end_date", "updated_at"],
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
    ],
    order: [["updated_at", "desc"]],
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
    const key = moment(plain.period_end_date || plain.updated_at).format(
      "YYYY-MM",
    );
    if (trendBuckets[key]) trendBuckets[key].value += 1;
  }
  const productivity_trend = Object.values(trendBuckets);

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

  return {
    success: true,
    data: {
      source,
      kpis: {
        approved,
        draft,
        submitted,
        rejected,
        total,
        approval_rate_pct,
      },
      status_donut: Array.from(statusCounts.values()),
      weekly_progress,
      monthly_progress,
      productivity_trend,
      team_activity,
      recent_activity,
      quick_links_hint: {
        has_pending_approvals: submitted > 0,
        open_timesheet_id: pendingSubmitted?.id ?? null,
      },
    },
  };
}

function emptyDashboard(source) {
  return {
    source,
    kpis: {
      approved: 0,
      draft: 0,
      submitted: 0,
      rejected: 0,
      total: 0,
      approval_rate_pct: 0,
    },
    status_donut: [],
    weekly_progress: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day) => ({ day, completed: 0, pending: 0 }),
    ),
    monthly_progress: [],
    productivity_trend: [],
    team_activity: [],
    recent_activity: [],
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
