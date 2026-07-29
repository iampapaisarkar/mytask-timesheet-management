import { fn, col, literal, Op } from "sequelize";
import { mysheet } from "../database.js";
import models from "../models/index.js";
const {
  Users,
  UserTimezones,
  Jobs,
  Employees,
  HolidayCalendars,
  Timesheets,
  TimesheetDays,
  TimesheetDayStatus,
  TimesheetDayTasks,
  TimesheetTaskActivityPairs,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
  GeofenceEvents,
} = models;

import moment from "moment-timezone";
import timeUtils from "../utils/timeUtils.js";
import redisUtils from "../utils/redisUtils.js";

async function saveUpdateTimesheetAndTask(
  user,
  organisationId,
  employeeId,
  is_public_holiday = false,
  timesheetId,
  dayId,
  tasks,
  timesheetDayStatus,
  remarks = null
) {
  const transaction = await mysheet.transaction();
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
            attributes: ["id", "name"],
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
      { transaction }
    );
    const employee = employeeJson?.toJSON() ?? null;
    const employeeTimezone = employee?.details?.user?.timezone?.timezone;

    if (timesheetDayStatus) {
      await TimesheetDays.update(
        {
          remarks: remarks || null,
          is_public_holiday: is_public_holiday,
          status_id: timesheetDayStatus.id,
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
        }
      );
    }

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
      { transaction }
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
      { transaction }
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
              task?.end_time
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
          { transaction }
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
          { transaction }
        );
      }
    }
    await redisUtils.setCache(
      `timesheet_day:${organisationId}:${employeeId}:${dayId}`
    );
    await redisUtils.setCache(
      `timesheet_days:${organisationId}:${timesheetId}:${timesheetDayStatus?.code}`
    );

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
  dayStatusCondition = null,
  whereCondition = null
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
      ],
      include: [
        {
          model: Employees.unscoped(),
          as: "employee",
          attributes: ["id"],
          include: [
            {
              model: Users,
              as: "user",
              attributes: ["id", "name"],
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
          required: !!dayStatusCondition,
          include: [
            {
              model: HolidayCalendars,
              as: "holiday",
            },
            {
              model: TimesheetDayStatus,
              as: "status",
              required: !!dayStatusCondition,
              ...(dayStatusCondition && { where: dayStatusCondition }),
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
          model: TimesheetDayStatus,
          as: "status",
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

    let { tracking_logs, tasks, ...rest } = timesheetDay;
    tracking_logs.sort((a, b) => a.id - b.id);
    const formattedTimesheetDay = {
      ...rest,
      tasks: formatDayTasks(tasks, employeeTimezone),
      timeline_logs: formatTimelineLogs(tracking_logs, employeeTimezone),
      tracking_logs: formatTrackingLogs(tracking_logs, employeeTimezone),
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

export default {
  saveUpdateTimesheetAndTask,
  getTimesheetDays,
  getTimesheetDay,
};
