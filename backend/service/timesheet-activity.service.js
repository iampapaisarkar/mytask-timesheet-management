import { Op } from "sequelize";
import Auth from "#auth";
import moment from "moment-timezone";
import { mysheet } from "../database.js";
import models from "../models/index.js";
import redisUtils from "../utils/redis.utils.js";
import timeUtils from "../utils/time.utils.js";

const {
  Organisations,
  Jobs,
  FcmConnections,
  TimesheetDays,
  TimesheetDayTasks,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
  TimesheetTaskActivityPairs,
  GeofenceEvents,
} = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/* -------------------------------------------
 * Utility functions
 * ------------------------------------------- */
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function isInsideRadius(userLat, userLng, jobLat, jobLng, radiusMeters) {
  return (
    getDistanceFromLatLonInMeters(userLat, userLng, jobLat, jobLng) <=
    radiusMeters
  );
}

/* -------------------------------------------
 * DB Helpers (NOW WITH TRANSACTION)
 * ------------------------------------------- */
async function getActivityType(code, t) {
  return TimesheetActivityTypes.findOne({ where: { code }, transaction: t });
}

async function createActivityLog(params, t) {
  return TimesheetActivityLogs.create(params, { transaction: t });
}

async function endLastActivity(lastActivityType, ctx, t) {
  if (!lastActivityType) return;
  return createActivityLog(
    {
      ...ctx,
      start_at: null,
      end_at: ctx.currentUTCTime,
      type_id: lastActivityType.id,
    },
    t,
  );
}

async function startNewActivity(activityType, ctx, t) {
  if (!activityType) return;
  return createActivityLog(
    {
      ...ctx,
      start_at: ctx.currentUTCTime,
      end_at: null,
      type_id: activityType.id,
    },
    t,
  );
}

async function updateLastDayTaskEndTime(
  { organisation, user, timesheetDay, end_time, timesheet_activity_log_end_id },
  t,
) {
  const lastTask = await TimesheetDayTasks.findOne({
    where: {
      organisation_id: organisation.id,
      employee_id: organisation?.employee?.id,
      timesheet_day_id: timesheetDay.id,
      end_time: null,
    },
    order: [["id", "DESC"]],
    transaction: t,
  });

  if (!lastTask) return null;

  end_time = moment(end_time).utc().format("HH:mm");

  const total_hours = lastTask.start_time
    ? timeUtils.decimalHours(lastTask.start_time, end_time)
    : 0;

  const currentUTCTime = moment().utc().format();

  await TimesheetDayTasks.update(
    {
      end_time,
      total_hours,
      original_log: {
        job_id: lastTask.job_id,
        start_time: lastTask.start_time,
        end_time,
        total_hours,
        is_travel: lastTask.is_travel,
        is_break: lastTask.is_break,
      },
      updated_at: currentUTCTime,
      updated_by: user.id,
    },
    { where: { id: lastTask.id }, transaction: t },
  );

  await TimesheetTaskActivityPairs.update(
    { timesheet_activity_log_end_id },
    {
      where: {
        organisation_id: organisation.id,
        employee_id: organisation?.employee?.id,
        timesheet_day_id: timesheetDay.id,
        timesheet_day_task_id: lastTask.id,
        timesheet_activity_log_end_id: null,
      },
      transaction: t,
    },
  );

  return {
    updatedId: lastTask.id,
    job_id: lastTask.job_id,
    was_travel: lastTask.is_travel,
    was_break: lastTask.is_break,
  };
}

async function createDayTask(
  {
    organisation,
    user,
    timesheetDay,
    jobId,
    start_time,
    end_time,
    is_travel,
    is_break,
    timesheet_activity_log_start_id,
  },
  t,
) {
  const currentUTCTime = moment().utc().format();

  await TimesheetDays.update(
    {
      updated_at: currentUTCTime,
      updated_by: user.id,
    },
    {
      where: {
        id: timesheetDay.id,
        organisation_id: organisation.id,
        timesheet_id: timesheetDay.timesheet_id,
        employee_id: organisation.employee.id,
      },
      transaction: t,
    },
  );

  start_time = moment(start_time).utc().format("HH:mm");
  if (end_time) end_time = moment(end_time).utc().format("HH:mm");

  const total_hours =
    start_time && end_time ? timeUtils.decimalHours(start_time, end_time) : 0;

  const dayTask = await TimesheetDayTasks.create(
    {
      organisation_id: organisation.id,
      employee_id: organisation.employee.id,
      timesheet_id: timesheetDay.timesheet_id,
      timesheet_day_id: timesheetDay.id,
      job_id: jobId,
      start_time,
      end_time,
      total_hours,
      is_travel,
      is_break,
      original_log: {
        job_id: jobId,
        start_time,
        end_time,
        total_hours,
        is_travel,
        is_break,
      },
      source: "auto",
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    },
    { transaction: t },
  );

  await TimesheetTaskActivityPairs.create(
    {
      organisation_id: organisation.id,
      employee_id: organisation.employee.id,
      timesheet_id: timesheetDay.timesheet_id,
      timesheet_day_id: timesheetDay.id,
      timesheet_day_task_id: dayTask.id,
      timesheet_activity_log_start_id,
      timesheet_activity_log_end_id: null,
    },
    { transaction: t },
  );

  return dayTask;
}

/* -------------------------------------------
 * Job Helpers
 * ------------------------------------------- */
async function fetchJobsForOrganisation(organisation, t) {
  let employeeCondition = {};
  if (["manager", "staff", "moderator"].includes(organisation?.role?.code)) {
    employeeCondition.employee_id = organisation?.employee?.id;
  }

  return Jobs.scope({ method: ["withEmployee", employeeCondition] }).findAll(
    {
      where: { organisation_id: organisation.id },
      raw: true,
    },
    { transaction: t },
  );
}

function findMatchingJob(latitude, longitude, jobs) {
  for (const job of jobs) {
    if (
      isInsideRadius(
        latitude,
        longitude,
        job.address.latitude,
        job.address.longitude,
        job.radius,
      )
    ) {
      return job;
    }
  }
  return null;
}

/* -------------------------------------------
 * EXIT Handling Logic
 * ------------------------------------------- */
async function processAutoExit(
  {
    lastActivityType,
    matchedJob,
    ctx,
    workingType,
    travelType,
    organisation,
    user,
    timesheetDay,
    lastActivity,
  },
  t,
) {
  // EXIT only when previously inside job AND now outside AND was working
  if (!matchedJob && lastActivityType?.code === "working") {
    // 1) END WORKING activity log
    const endLog = await endLastActivity(lastActivityType, ctx, t);

    // 2) Update last day task (ONLY if job_id != null)
    let lastTaskMeta = null;

    if (timesheetDay) {
      lastTaskMeta = await updateLastDayTaskEndTime(
        {
          organisation,
          user,
          timesheetDay,
          end_time: ctx.currentUTCTime,
          timesheet_activity_log_end_id: endLog.id,
        },
        t,
      );
    }

    // 3) Insert geofence exit event
    await GeofenceEvents.create(
      {
        organisation_id: ctx.organisation_id,
        user_id: ctx.user_id,
        timesheet_activity_log_id: lastActivity?.id || null,
        job_id: lastTaskMeta?.job_id || null,
        action: "EXIT",
        track_at: ctx.track_at,
      },
      { transaction: t },
    );

    const startLog = await startNewActivity(travelType, ctx, t);

    // 4) If last task had job → create TRAVEL task
    if (timesheetDay && lastTaskMeta?.job_id) {
      await createDayTask(
        {
          organisation,
          user,
          timesheetDay,
          jobId: null,
          start_time: ctx.currentUTCTime,
          end_time: null,
          is_travel: true,
          is_break: false,
          timesheet_activity_log_start_id: startLog.id,
        },
        t,
      );
    }

    return true;
  }

  return false;
}

/* -------------------------------------------
 * MAIN FUNCTION (WITH MASTER TRANSACTION)
 * ------------------------------------------- */
async function storeLocation({
  location,
  type,
  organisationCode,
  userId,
  fcmToken,
}) {
  // Start transaction early (we will rollback on any early return)
  const transaction = await mysheet.transaction();

  try {
    if (typeof location === "string") location = JSON.parse(location);

    if (!fcmToken) {
      await transaction.rollback();
      throw new AppError("FCM token is required!", 400);
    }
    if (!organisationCode) {
      await transaction.rollback();
      throw new AppError("Organisation code is required!", 400);
    }

    const fcmConn = await FcmConnections.findOne({
      attributes: ["id", "user_id"],
      where: { token: fcmToken, user_id: userId },
      transaction,
    });

    if (!fcmConn || !fcmConn.user_id) {
      await transaction.rollback();
      throw new AppError("Unauthorized request!", 400);
    }

    const userResponse = await Auth.getUser(fcmConn.user_id);
    if (!userResponse?.success) {
      await transaction.rollback();
      throw new AppError("Unauthorized request!", 400);
    }

    const user = userResponse.user;

    const organisationData = await Organisations.scope({
      method: ["withUser", user.id],
    }).findOne({
      where: { code: organisationCode },
      raw: false,
      nest: true,
      transaction,
    });

    const organisation = organisationData?.toJSON();

    if (!organisation || organisation?.role?.code === "owner") {
      await transaction.rollback();
      throw new AppError("Unauthorized request!", 400);
    }

    const latitude = location?.coords?.latitude;
    const longitude = location?.coords?.longitude;
    const timestamp = location?.timestamp;
    const currentUTCTime = moment().utc().format();

    // --- FIX: Skip if device timestamp is not today's UTC date ---
    const deviceTime = moment.utc(timestamp);

    // Today's date in UTC
    const todayUTC = moment.utc().format("YYYY-MM-DD");

    // Device timestamp date (UTC)
    const deviceDateUTC = deviceTime.format("YYYY-MM-DD");

    // If device timestamp is NOT today → ignore this location
    if (deviceDateUTC !== todayUTC) {
      await transaction.rollback();
      throw new AppError(
        "Device timestamp is not today's UTC date — skipped stale location",
        400,
      );
    }

    const userTimezoneCurrentDate = moment()
      .tz(user?.timezone?.timezone || "UTC")
      .format("YYYY-MM-DD");

    const timesheetDay = await TimesheetDays.findOne({
      where: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
        date: userTimezoneCurrentDate,
      },
      transaction,
    });

    const ctx = {
      organisation_id: organisation.id,
      user_id: user.id,
      latitude,
      longitude,
      track_at: timestamp,
      currentUTCTime,
      timesheet_day_id: timesheetDay?.id ?? null,
    };

    const lastActivityData = await TimesheetActivityLogs.findOne({
      include: [{ model: TimesheetActivityTypes, as: "type" }],
      where: {
        user_id: user.id,
        organisation_id: organisation.id,
        type_id: { [Op.ne]: null },
        end_at: null, // 🔥 ONLY OPEN ACTIVITY
      },
      order: [["id", "DESC"]], // 🔥 ID is safest
      transaction,
    });

    const lastActivity = lastActivityData?.toJSON();
    const lastActivityType = lastActivity?.type;

    /* ============================================================================
     * IF TYPE PRESENT (start / pause / resume / stop) - MANUAL ACTIONS
     * ============================================================================
     */
    if (type) {
      // NOTE: fetchJobsForOrganisation / findMatchingJob / processAutoExit may be
      // in other files. We pass `transaction` where helpful. Extra args won't break
      // typical JS functions that ignore them.
      const jobs = await fetchJobsForOrganisation(organisation, transaction);
      const matchedJob = findMatchingJob(latitude, longitude, jobs);

      const workingType = await getActivityType("working", transaction);
      const travelType = await getActivityType("travel", transaction);
      const breakType = await getActivityType("break", transaction);

      // Before handling actions -> auto EXIT check
      await processAutoExit(
        {
          lastActivityType,
          matchedJob,
          ctx,
          workingType,
          travelType,
          organisation,
          user,
          timesheetDay,
          lastActivity,
        },
        transaction,
      );

      switch (type) {
        case "start": {
          // Prevent duplicate start when already working on same job
          if (
            matchedJob &&
            lastActivityType?.code === "working" &&
            lastActivity?.job_id === matchedJob.id
          ) {
            // already working on the same job — ignore start
            await transaction.rollback();
            return true;
          }

          const activityType = matchedJob ? workingType : travelType;
          const startLog = await startNewActivity(
            activityType,
            ctx,
            transaction,
          );

          if (timesheetDay) {
            if (matchedJob) {
              // working task with job
              await createDayTask(
                {
                  organisation,
                  user,
                  timesheetDay,
                  jobId: matchedJob.id,
                  start_time: ctx.currentUTCTime,
                  end_time: null,
                  is_travel: false,
                  is_break: false,
                  timesheet_activity_log_start_id: startLog.id,
                },
                transaction,
              );
            } else {
              // travel task
              await createDayTask(
                {
                  organisation,
                  user,
                  timesheetDay,
                  jobId: null,
                  start_time: ctx.currentUTCTime,
                  end_time: null,
                  is_travel: true,
                  is_break: false,
                  timesheet_activity_log_start_id: startLog.id,
                },
                transaction,
              );
            }
          }
          if (matchedJob) {
            await GeofenceEvents.create(
              {
                organisation_id: organisation.id,
                user_id: user.id,
                timesheet_activity_log_id: startLog.id,
                job_id: matchedJob.id,
                action: "ENTER",
                track_at: timestamp,
              },
              { transaction },
            );
          }
          break;
        }

        case "pause": {
          if (!lastActivityType || ["break"].includes(lastActivityType.code))
            break;
          const endLog = await endLastActivity(
            lastActivityType,
            ctx,
            transaction,
          );
          // update last TimesheetDayTasks (end_time = now)
          if (timesheetDay) {
            await updateLastDayTaskEndTime(
              {
                organisation,
                user,
                timesheetDay,
                end_time: ctx.currentUTCTime,
                timesheet_activity_log_end_id: endLog.id,
              },
              transaction,
            );

            const startLog = await startNewActivity(
              breakType,
              ctx,
              transaction,
            );

            // create new break task (end_time null)
            await createDayTask(
              {
                organisation,
                user,
                timesheetDay,
                jobId: null,
                start_time: ctx.currentUTCTime,
                end_time: null,
                is_travel: false,
                is_break: true,
                timesheet_activity_log_start_id: startLog.id,
              },
              transaction,
            );
          }
          break;
        }

        case "resume": {
          if (lastActivityType?.code !== "break") break;
          const endLog = await endLastActivity(
            lastActivityType,
            ctx,
            transaction,
          );
          // decide next activity type based on whether we're inside a job
          const jobs = await fetchJobsForOrganisation(
            organisation,
            transaction,
          );
          const matchedJobNow = findMatchingJob(latitude, longitude, jobs);
          const nextType = matchedJobNow ? workingType : travelType;
          const startLog = await startNewActivity(nextType, ctx, transaction);

          // Update last TimesheetDayTasks (end_time on break)
          if (timesheetDay) {
            const lastTaskMeta = await updateLastDayTaskEndTime(
              {
                organisation,
                user,
                timesheetDay,
                end_time: ctx.currentUTCTime,
                timesheet_activity_log_end_id: endLog.id,
              },
              transaction,
            );

            // Determine next task: if last active task (before break) had job → resume working for that job
            // Fallback to matchedJob based on current location

            let nextJobId = null;
            let nextIsTravel = false;

            if (
              lastTaskMeta &&
              lastTaskMeta.job_id &&
              !lastTaskMeta.was_break &&
              !lastTaskMeta.was_travel
            ) {
              // Case: Resume to the job user was working on before the break (if it was working)
              nextJobId = lastTaskMeta.job_id;
              nextIsTravel = false;
            } else if (matchedJobNow) {
              // Case: Resume working in the current location's job
              nextJobId = matchedJobNow.id;
              nextIsTravel = false;
            } else {
              // Case: Resume to travel
              nextJobId = null;
              nextIsTravel = true;
            }

            // create new task starting now
            await createDayTask(
              {
                organisation,
                user,
                timesheetDay,
                jobId: nextJobId,
                start_time: ctx.currentUTCTime,
                end_time: null,
                is_travel: nextIsTravel,
                is_break: false,
                timesheet_activity_log_start_id: startLog.id,
              },
              transaction,
            );
          }
          break;
        }

        case "stop": {
          let endLog = null;
          if (lastActivityType) {
            endLog = await endLastActivity(lastActivityType, ctx, transaction);
          }

          // update last TimesheetDayTasks end_time
          if (timesheetDay) {
            await updateLastDayTaskEndTime(
              {
                organisation,
                user,
                timesheetDay,
                end_time: ctx.currentUTCTime,
                timesheet_activity_log_end_id: endLog?.id,
              },
              transaction,
            );
          }
          break;
        }
      }

      // commit and return success for manual types
      await transaction.commit();
      return true;
    }

    /* ============================================================================
     * BACKGROUND TRACKING (TYPE = null) - AUTOMATIC GEO-FENCE HANDLING
     * ============================================================================
     */
    const jobs = await fetchJobsForOrganisation(organisation, transaction);
    const matchedJob = findMatchingJob(latitude, longitude, jobs);

    const workingType = await getActivityType("working", transaction);
    const travelType = await getActivityType("travel", transaction);

    // AUTO EXIT CHECK FIRST
    const exitTriggered = await processAutoExit(
      {
        lastActivityType,
        matchedJob,
        ctx,
        workingType,
        travelType,
        organisation,
        user,
        timesheetDay,
        lastActivity,
      },
      transaction,
    );

    // If job ENTER (auto) — ONLY create enter IF user was previously outside or coming from travel
    if (!exitTriggered && matchedJob && timesheetDay) {
      // CASE A: user is already working inside same job -> do nothing
      if (
        lastActivityType?.code === "working" &&
        lastActivity?.job_id === matchedJob.id
      ) {
        // already inside and working for the same job — no new rows
      }
      // CASE B: user was travelling -> close travel and start working
      else if (lastActivityType?.code === "travel") {
        const endLog = await endLastActivity(
          lastActivityType,
          ctx,
          transaction,
        );

        const startLog = await startNewActivity(workingType, ctx, transaction);

        // close travel task
        await updateLastDayTaskEndTime(
          {
            organisation,
            user,
            timesheetDay,
            end_time: ctx.currentUTCTime,
            timesheet_activity_log_end_id: endLog?.id,
          },
          transaction,
        );

        // start working task
        await createDayTask(
          {
            organisation,
            user,
            timesheetDay,
            jobId: matchedJob.id,
            start_time: ctx.currentUTCTime,
            end_time: null,
            is_travel: false,
            is_break: false,
            timesheet_activity_log_start_id: startLog.id,
          },
          transaction,
        );

        // geofence enter
        await GeofenceEvents.create(
          {
            organisation_id: organisation.id,
            user_id: user.id,
            timesheet_activity_log_id: startLog.id,
            job_id: matchedJob.id,
            action: "ENTER",
            track_at: timestamp,
          },
          { transaction },
        );
      }
      // CASE C: no last activity (first time) OR last activity was unrelated -> create working entry
      else if (!lastActivityType) {
        const startLog = await startNewActivity(workingType, ctx, transaction);

        await createDayTask(
          {
            organisation,
            user,
            timesheetDay,
            jobId: matchedJob.id,
            start_time: ctx.currentUTCTime,
            end_time: null,
            is_travel: false,
            is_break: false,
            timesheet_activity_log_start_id: startLog.id,
          },
          transaction,
        );

        await GeofenceEvents.create(
          {
            organisation_id: organisation.id,
            user_id: user.id,
            timesheet_activity_log_id: startLog.id,
            job_id: matchedJob.id,
            action: "ENTER",
            track_at: timestamp,
          },
          { transaction },
        );
      } else {
        // if lastActivityType exists but isn't travel/working (e.g., break) and there's no open task,
        // create a working task only if there's no open task
        const openTask = await TimesheetDayTasks.findOne({
          where: {
            organisation_id: organisation.id,
            employee_id: organisation?.employee?.id,
            timesheet_day_id: timesheetDay.id,
            end_time: null,
          },
          transaction,
        });

        if (!openTask) {
          const startLog = await startNewActivity(
            workingType,
            ctx,
            transaction,
          );

          await createDayTask(
            {
              organisation,
              user,
              timesheetDay,
              jobId: matchedJob.id,
              start_time: ctx.currentUTCTime,
              end_time: null,
              is_travel: false,
              is_break: false,
              timesheet_activity_log_start_id: startLog.id,
            },
            transaction,
          );

          await GeofenceEvents.create(
            {
              organisation_id: organisation.id,
              user_id: user.id,
              timesheet_activity_log_id: startLog.id,
              job_id: matchedJob.id,
              action: "ENTER",
              track_at: timestamp,
            },
            { transaction },
          );
        }
      }
    }

    // RAW LOCATION ACTIVITY
    await createActivityLog(
      {
        ...ctx,
        start_at: null,
        end_at: null,
        type_id: null,
      },
      transaction,
    );

    await redisUtils.delCache(
      `timesheet_day:${organisation?.id}:${organisation?.employee?.id}:${timesheetDay?.id}`,
    );

    await transaction.commit();
    return true;
  } catch (err) {
    console.error("Error in timesheet store() TX:", err);
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error("Rollback error:", rbErr);
    }
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to store user's current location data!", 500);
  }
}

export default {
  storeLocation,
};
