import { Op, col } from "sequelize";
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
import { getDashboardOverview as getDashboardOverviewImpl } from "./dashboard.service.js";

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

export { getDashboardOverview } from "./dashboard.service.js";

export default {
  getOrgBootstrap,
  getHomeBootstrap,
  getEmployeeFormLookups,
  getTimesheetDayEditor,
  getDashboardOverview: getDashboardOverviewImpl,
};
