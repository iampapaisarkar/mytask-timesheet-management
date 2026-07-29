import { fn, col, literal, Op } from "sequelize";
import { db } from "../database.js";
import models from "../models/index.js";
const {
  Users,
  UserTimezones,
  Jobs,
  Employees,
  HolidayCalendars,
  Timesheets,
  TimesheetDays,
  TimesheetStatus,
  TimesheetDayTasks,
  TimesheetTaskActivityPairs,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
  GeofenceEvents,
  ManagementGroupEmployees,
  UserOrganisationRoles,
  OrganisationRoles,
} = models;

import moment from "moment-timezone";
import timeUtils from "../utils/time.utils.js";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";

async function saveUpdateTimesheetAndTask(
  user,
  organisationId,
  employeeId,
  is_public_holiday = false,
  timesheetId,
  dayId,
  tasks,
  remarks = null,
) {
  const transaction = await db.transaction();
  try {
    const currentUTCTime = moment().utc().format();

    const employeeJson = await Employees.unscoped().findOne(
      {
        attributes: ["id", "user_id"],
        where: {
          id: employeeId,
        },
        include: [
          {
            model: Users.unscoped(),
            as: "user",
            attributes: ["id", "full_name"],
            include: [
              {
                model: UserTimezones.unscoped(),
                as: "timezone",
                attributes: ["timezone"],
              },
            ],
          },
        ],
        raw: false,
        nest: true,
      },
      { transaction },
    );
    const employee = employeeJson?.toJSON() ?? null;
    const employeeTimezone = employee?.details?.user?.timezone?.timezone;

    await TimesheetDays.update(
      {
        remarks: remarks || null,
        is_public_holiday: is_public_holiday,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: {
          id: dayId,
          organisation_id: organisationId,
          timesheet_id: timesheetId,
          employee_id: employeeId,
        },
        transaction,
      },
    );

    // create tasks
    await TimesheetDayTasks.destroy(
      {
        where: {
          organisation_id: organisationId,
          employee_id: employeeId,
          timesheet_id: timesheetId,
          timesheet_day_id: dayId,
        },
      },
      { transaction },
    );

    await TimesheetTaskActivityPairs.destroy(
      {
        where: {
          organisation_id: organisationId,
          employee_id: employeeId,
          timesheet_id: timesheetId,
          timesheet_day_id: dayId,
        },
      },
      { transaction },
    );

    if (tasks?.length > 0) {
      for (const task of tasks) {
        if (task?.original_log) {
          task.original_log.start_time = moment
            .tz(task.original_log.start_time, "HH:mm:ss", employeeTimezone)
            .utc()
            .format("HH:mm:ss");
          task.original_log.end_time = moment
            .tz(task.original_log.end_time, "HH:mm:ss", employeeTimezone)
            .utc()
            .format("HH:mm:ss");
        }
        const res = await TimesheetDayTasks.create(
          {
            organisation_id: organisationId,
            employee_id: employeeId,
            timesheet_id: timesheetId,
            timesheet_day_id: dayId,
            job_id: task?.is_break || task?.is_travel ? null : task?.job?.id,
            start_time: moment
              .tz(task?.start_time, "HH:mm:ss", employeeTimezone)
              .utc()
              .format("HH:mm:ss"),
            end_time: moment
              .tz(task?.end_time, "HH:mm:ss", employeeTimezone)
              .utc()
              .format("HH:mm:ss"),
            total_hours: timeUtils.decimalHours(
              task?.start_time,
              task?.end_time,
            ),
            is_break: task?.is_break,
            is_travel: task?.is_travel,
            original_log: task?.original_log || null,
            source: task?.original_log ? "auto" : "manual",
            remarks: task?.remarks,
            created_at: currentUTCTime,
            created_by: user.id,
            updated_at: currentUTCTime,
            updated_by: user.id,
          },
          { transaction },
        );

        await TimesheetTaskActivityPairs.create(
          {
            organisation_id: organisationId,
            employee_id: employeeId,
            timesheet_id: timesheetId,
            timesheet_day_id: dayId,
            timesheet_day_task_id: res?.id,
            timesheet_activity_log_start_id:
              task?.task_timeline?.timesheet_activity_log_start_id,
            timesheet_activity_log_end_id:
              task?.task_timeline?.timesheet_activity_log_end_id,
          },
          { transaction },
        );
      }
    }
    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback(); // ❌ rollback everything

    console.error("Rolling back timesheet:", err.message);
    return false;
  }
}

async function getTimesheetDays(
  employeeCondition = null,
  whereCondition = null,
) {
  try {
    const timesheetJson = await Timesheets.findOne({
      where: {
        ...(whereCondition || {}),
        ...(employeeCondition || {}),
      },
      attributes: [
        "code",
        "employee_id",
        "id",
        "organisation_id",
        "payroll_calendar_id",
        "period_start_date",
        "period_end_date",
        "period_range",
        "approval_reason",
        "reject_reason",
        "xero_timesheet_id",
      ],
      include: [
        {
          model: TimesheetStatus,
          as: "status",
        },
        {
          model: Employees.unscoped(),
          as: "employee",
          attributes: ["id"],
          include: [
            {
              model: Users,
              as: "user",
              attributes: [
                "id",
                "first_name",
                "middle_name",
                "last_name",
                "full_name",
              ],
              include: [
                {
                  model: UserTimezones,
                  as: "timezone",
                  attributes: ["timezone"],
                },
              ],
            },
          ],
        },
        {
          model: TimesheetDays,
          as: "days",
          include: [
            {
              model: HolidayCalendars,
              as: "holiday",
            },
            {
              model: TimesheetDayTasks,
              as: "tasks",
              attributes: [
                "id",
                "timesheet_id",
                "timesheet_day_id",
                "total_hours",
                "is_break",
                "is_travel",
              ],
            },
          ],
        },
      ],
      order: [
        // Order date
        [{ model: TimesheetDays, as: "days" }, "date", "ASC"],

        // Order tasks
        [
          { model: TimesheetDays, as: "days" },
          { model: TimesheetDayTasks, as: "tasks" },
          "id",
          "ASC",
        ],
      ],
    });

    const timesheet = timesheetJson?.toJSON() ?? null;

    if (!timesheet) {
      return { success: false, code: 404 };
    }

    // Enrich days for list/detail UIs (Vue TimesheetPage expects day_name + hours)
    if (Array.isArray(timesheet.days)) {
      timesheet.days = timesheet.days.map((day) => {
        const tasks = Array.isArray(day.tasks) ? day.tasks : [];
        const totalHours = tasks.reduce((sum, task) => {
          const h = parseFloat(task.total_hours);
          return sum + (Number.isFinite(h) ? h : 0);
        }, 0);
        let dayName = day.day_name;
        if (!dayName && day.date) {
          try {
            dayName = new Date(`${day.date}T12:00:00`).toLocaleDateString(
              "en-AU",
              { weekday: "long" },
            );
          } catch {
            dayName = null;
          }
        }
        return {
          ...day,
          day_name: dayName,
          total_hours:
            day.total_hours != null
              ? day.total_hours
              : Number(totalHours.toFixed(2)),
        };
      });
    }

    return { success: true, data: timesheet };
  } catch (err) {
    console.error("Error fetching timesheetDays:", err);
    return { success: false, message: err.message };
  }
}

async function getTimesheetDay(whereCondition = null, employeeTimezone = null) {
  try {
    const timesheetDayJson = await TimesheetDays.findOne({
      ...(whereCondition && { where: whereCondition }),
      include: [
        {
          model: HolidayCalendars,
          as: "holiday",
        },
        {
          model: TimesheetActivityLogs,
          as: "tracking_logs",
          required: false,
          include: [
            {
              model: TimesheetActivityTypes,
              as: "type",
            },
            {
              model: GeofenceEvents,
              as: "geofence",
              include: [
                {
                  model: Jobs,
                  as: "job",
                },
              ],
            },
          ],
        },
        {
          model: TimesheetDayTasks,
          as: "tasks",
          include: [
            {
              model: TimesheetTaskActivityPairs,
              as: "task_timeline",
              include: [
                {
                  model: TimesheetActivityLogs,
                  as: "start",
                  include: [
                    {
                      model: TimesheetActivityTypes,
                      as: "type",
                    },
                  ],
                },
                {
                  model: TimesheetActivityLogs,
                  as: "end",
                  include: [
                    {
                      model: TimesheetActivityTypes,
                      as: "type",
                    },
                  ],
                },
              ],
            },
            {
              model: Jobs,
              as: "job",
            },
          ],
        },
      ],
      order: [
        // Order tasks
        [{ model: TimesheetDayTasks, as: "tasks" }, "id", "ASC"],
        // Order tracking_logs
        [
          { model: TimesheetActivityLogs, as: "tracking_logs" },
          "track_at",
          "ASC",
        ],
      ],
    });

    const timesheetDay = timesheetDayJson?.toJSON() ?? null;

    if (!timesheetDay) {
      return { success: false, code: 404 };
    }

    const timesheetJson = await Timesheets.findOne({
      where: {
        id: timesheetDay.timesheet_id,
        organisation_id: timesheetDay.organisation_id,
        employee_id: timesheetDay.employee_id,
      },
      include: [
        {
          model: TimesheetStatus,
          as: "status",
        },
      ],
    });

    const timesheet = timesheetJson?.toJSON() ?? null;

    let { tracking_logs, tasks, ...rest } = timesheetDay;
    tracking_logs.sort((a, b) => a.id - b.id);
    const formattedTimesheetDay = {
      ...rest,
      tasks: formatDayTasks(tasks, employeeTimezone),
      timeline_logs: formatTimelineLogs(tracking_logs, employeeTimezone),
      tracking_logs: formatTrackingLogs(tracking_logs, employeeTimezone),
      status: timesheet?.status,
    };

    return { success: true, data: formattedTimesheetDay };
  } catch (err) {
    console.error("Error fetching timesheetDay:", err);
    return { success: false, message: err.message };
  }
}

function formatDayTasks(tasks, tz) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.map((task) => {
    const { task_timeline, original_log, ...tsk } = task;

    let formattedOriginalLog = null;
    if (original_log) {
      let parsedLog = null;
      try {
        parsedLog = original_log ? JSON.parse(original_log) : null;
      } catch (e) {
        parsedLog = null;
      }

      formattedOriginalLog = {
        ...parsedLog,
        start_time: timeUtils.convertUserLocalTime(parsedLog?.start_time, tz),
        end_time: timeUtils.convertUserLocalTime(parsedLog?.end_time, tz),
      };
    }

    let formattedTimeline = null;
    if (task_timeline) {
      const { start, end, ...tsk_rest } = task_timeline;
      formattedTimeline = {
        start_at: timeUtils.convertUserLocalDateTime(start?.start_at, tz),
        end_at: timeUtils.convertUserLocalDateTime(end?.end, tz),
        track_at: start?.track_at,
        type_id: start?.type_id,
        type: start?.type,
        ...tsk_rest,
      };
    }
    return {
      ...tsk,
      start_time: timeUtils.convertUserLocalTime(task?.start_time, tz),
      end_time: timeUtils.convertUserLocalTime(task?.end_time, tz),
      original_log: formattedOriginalLog,
      task_timeline: formattedTimeline,
    };
  });
}

function formatTimelineLogs(tracking_logs, tz) {
  const result = [];
  let current = null;

  if (!Array.isArray(tracking_logs)) {
    return result;
  }

  for (let row of tracking_logs) {
    // START row
    if (row.start_at && row.type_id) {
      row.start_at = timeUtils.convertUserLocalDateTime(row?.start_at, tz);
      // If previous block still open → close with end_null
      if (current) {
        // Close the previous block as an open segment
        result.push({
          ...current,
          end_at: null,
          timesheet_activity_log_end_id: null,
          longitude: null,
        });
      }

      // Start new block (using properties available on the log row)
      current = {
        organisation_id: row.organisation_id,
        employee_id: row.employee_id || row.timesheet_day_id, // Default to a safe ID if missing
        timesheet_id: row.timesheet_id || row.timesheet_day_id, // Default to a safe ID if missing
        timesheet_day_id: row.timesheet_day_id,
        timesheet_day_task_id: null,
        job: row?.geofence?.job,
        type_id: row.type_id,
        type: row.type,
        start_at: row.start_at,
        end_at: null, // Always starts as null

        timesheet_activity_log_start_id: row.id,
        latitude: row.latitude,
        longitude: null, // Initial longitude is null
        timesheet_activity_log_end_id: null,
      };
    }

    // END row
    else if (row.end_at && row.type_id && current) {
      row.end_at = timeUtils.convertUserLocalDateTime(row?.end_at, tz);
      if (row.type_id === current.type_id) {
        // Close the current block with the end data
        current.end_at = row.end_at;
        current.timesheet_activity_log_end_id = row.id;
        current.longitude = row.longitude;
        result.push(current);
        current = null; // Clear current block
      }
    }
  }

  // Last open block → end_null
  if (current) {
    result.push({
      ...current,
      end_at: null,
      timesheet_activity_log_end_id: null,
      longitude: null,
    });
  }
  return result;
}

function formatTrackingLogs(tracking_logs, tz) {
  const result = {
    travels: [],
    workings: [],
    breaks: [],
  };

  let currentSegment = null;
  let activeType = null;

  tracking_logs.sort((a, b) => a.track_at - b.track_at);

  tracking_logs.forEach((log) => {
    const type = log?.type?.code; // travel / working / break
    // don't need to format  start and end time here, it is already formatted on main function

    // Start new segment if no active segment
    if (!currentSegment && type) {
      currentSegment = [log];
      activeType = type;
      return;
    }

    // If segment is active
    if (currentSegment) {
      currentSegment.push(log);

      // End segment if end_at exists and type matches
      if (log.end_at && type === activeType) {
        result[`${activeType}s`].push(currentSegment);
        currentSegment = null;
        activeType = null;
      }

      return;
    }

    // Rows outside any segment are ignored
  });

  // Push any unfinished segment at the end
  if (currentSegment && activeType) {
    result[`${activeType}s`].push(currentSegment);
  }

  return result;
}

async function sendEmailAndNotification(user, organisation, timesheet, type) {
  try {
    /* ----------------------------------
     * Get organisation owner
     * ---------------------------------- */
    const organisationOwner = await UserOrganisationRoles.findOne({
      where: {
        organisation_id: organisation.id,
        user_id: {
          [Op.ne]: user.id, // ❌ exclude current user
        },
      },
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: OrganisationRoles,
          as: "role",
          attributes: ["id", "name", "code"],
          where: { code: "owner" },
        },
      ],
      raw: true,
      nest: true,
    });

    const organisationOwnerUser = organisationOwner?.user || null;

    /* ----------------------------------
     * Get employee
     * ---------------------------------- */
    const employeeJson = await Employees.scope("defaultScope").findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheet.employee_id,
      },
    });

    const employee = employeeJson?.toJSON() ?? null;

    /* ----------------------------------
     * Common vars
     * ---------------------------------- */
    let subject;
    let bodyMessage;
    let timesheetURLEmail;
    let timesheetURLAppNotification;

    let sendToEmails = [];
    let sendToNotificationUserIds = [];

    /* ----------------------------------
     * NORMAL USERS (staff / managers)
     * ---------------------------------- */
    if (type === "create") {
      subject = `You’ve Been Assigned a Timesheet (${timesheet.code}) - ${organisation.name}`;
      bodyMessage = `${user.full_name} has created and assigned the timesheet ${timesheet.code} to you.`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=draft`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=draft`;

      sendToEmails.push(employee?.details?.user?.email);
      sendToNotificationUserIds.push(employee?.details?.user?.id);
    } else if (type === "submit-by-manager") {
      subject = `Timesheet Submitted by Manager (${timesheet.code}) - ${organisation.name}`;
      bodyMessage = `Timesheet ${timesheet.code} has been submitted by a manager.`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=submitted`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=submitted`;

      sendToEmails.push(employee?.details?.user?.email);
      sendToNotificationUserIds.push(employee?.details?.user?.id);
    } else if (type === "submit-by-staff") {
      subject = `Timesheet Submitted for Approval (${timesheet.code}) - ${organisation.name}`;
      bodyMessage = `Timesheet ${timesheet.code} has been submitted for approval.`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`;

      const managementGroups = new Set();

      employee?.management_group?.manager_of_groups?.forEach((mg) =>
        managementGroups.add(mg.id),
      );

      if (employee?.management_group?.staff_of_group?.id) {
        managementGroups.add(employee.management_group.staff_of_group.id);
      }

      const managementGroupIds = [...managementGroups];

      const managerEmployees = await ManagementGroupEmployees.findAll({
        attributes: ["employee_id"],
        where: {
          group_id: { [Op.in]: managementGroupIds },
          is_manager: true,
        },
        include: [
          {
            model: Employees,
            as: "employee",
          },
        ],
        raw: true,
        nest: true,
      });

      sendToEmails = managerEmployees.map((e) => e?.employee?.user?.email);
      sendToNotificationUserIds = managerEmployees.map(
        (e) => e?.employee?.user?.id,
      );
    } else if (type === "approve") {
      subject = `Timesheet Approved (${timesheet.code}) - ${organisation.name}`;
      bodyMessage = `Timesheet ${timesheet.code} has been approved.`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=approved`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=approved`;

      sendToEmails.push(employee?.details?.user?.email);
      sendToNotificationUserIds.push(employee?.details?.user?.id);
    } else if (type === "reject") {
      subject = `Timesheet Rejected (${timesheet.code}) - ${organisation.name}`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=rejected`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=rejected`;

      sendToEmails.push(employee?.details?.user?.email);
      sendToNotificationUserIds.push(employee?.details?.user?.id);
    } else if (type === "revert") {
      subject = `Timesheet Reverted to Draft (${timesheet.code}) - ${organisation.name}`;
      bodyMessage = `Timesheet ${timesheet.code} has been reverted to draft.`;
      timesheetURLEmail = `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=draft`;
      timesheetURLAppNotification = `/org/${organisation.code}/timesheet/${timesheet.id}/details?tab=draft`;

      sendToEmails.push(employee?.details?.user?.email);
      sendToNotificationUserIds.push(employee?.details?.user?.id);
    }

    /* ----------------------------------
     * OWNER MESSAGE (DIFFERENT CONTENT)
     * ---------------------------------- */
    const ownerMessageMap = {
      create: {
        subject: `New Timesheet Created (${timesheet.code}) - ${organisation.name}`,
        body: `${user.full_name} created a new timesheet.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=draft`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=draft`,
      },
      "submit-by-staff": {
        subject: `Timesheet Submitted by Staff (${timesheet.code}) - ${organisation.name}`,
        body: `A staff member submitted a timesheet for approval.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`,
      },
      "submit-by-manager": {
        subject: `Timesheet Submitted by Manager (${timesheet.code}) - ${organisation.name}`,
        body: `A manager submitted a timesheet for approval.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=submitted`,
      },
      approve: {
        subject: `Timesheet Approved (${timesheet.code}) - ${organisation.name}`,
        body: `A timesheet has been approved.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=approved`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=approved`,
      },
      reject: {
        subject: `Timesheet Rejected (${timesheet.code}) - ${organisation.name}`,
        body: `A timesheet has been rejected.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=rejected`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=rejected`,
      },
      revert: {
        subject: `Timesheet Reverted (${timesheet.code}) - ${organisation.name}`,
        body: `A timesheet was reverted to draft.`,
        email_url: `${process.env.CLIENT_URL}/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=draft`,
        app_url: `/org/${organisation.code}/timesheet-management/${timesheet.id}/details?tab=draft`,
      },
    };

    const ownerContent = ownerMessageMap[type];

    /* ----------------------------------
     * SEND EMAILS
     * ---------------------------------- */
    if (sendToEmails.length) {
      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [...new Set(sendToEmails)],
        message: {
          subject,
          template: "timesheet.html",
          variables: {
            title: subject,
            message: bodyMessage,
            button_url: timesheetURLEmail,
            button_label: "View Timesheet",
          },
        },
      });
    }

    if (organisationOwnerUser?.email && ownerContent) {
      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [organisationOwnerUser.email],
        message: {
          subject: ownerContent.subject,
          template: "timesheet.html",
          variables: {
            title: ownerContent.subject,
            message: ownerContent.body,
            button_url: ownerContent.email_url,
            button_label: "View Timesheet",
          },
        },
      });
    }

    /* ----------------------------------
     * SEND PUSH NOTIFICATIONS
     * ---------------------------------- */
    if (sendToNotificationUserIds.length) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: [...new Set(sendToNotificationUserIds)],
        message: {
          title: subject,
          body: bodyMessage,
        },
        url: timesheetURLAppNotification,
      });
    }

    if (organisationOwnerUser?.id && ownerContent) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: [organisationOwnerUser.id],
        message: {
          title: ownerContent.subject,
          body: ownerContent.body,
        },
        url: ownerContent.app_url,
      });
    }
  } catch (err) {
    throw err;
  }
}

export default {
  saveUpdateTimesheetAndTask,
  getTimesheetDays,
  getTimesheetDay,
  sendEmailAndNotification,
};
