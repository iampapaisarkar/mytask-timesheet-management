import { Op } from "sequelize";
import Auth from "#auth";
import moment from "moment-timezone";
import { db } from "../database.js";
import models from "../models/index.js";
import redisUtils from "../utils/redis.utils.js";
import timeUtils from "../utils/time.utils.js";
import { emitTrackingUpdated } from "./realtime.service.js";

const {
  Organisations,
  Jobs,
  Timesheets,
  TimesheetJobs,
  TimesheetDays,
  TimesheetDayTasks,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
  TimesheetTaskActivityPairs,
  GeofenceEvents,
} = models;

/** Soft throttle continuous GPS breadcrumbs (per process; start/pause/stop always emit). */
const TRACKING_EMIT_THROTTLE_MS = 3_000;
const lastTrackingEmitAt = new Map();

function shouldEmitTrackingLive(timesheetDayId, type) {
  const action = String(type || "")
    .trim()
    .toLowerCase();
  if (["start", "pause", "resume", "stop"].includes(action)) {
    return true;
  }
  const key = String(timesheetDayId ?? "none");
  const now = Date.now();
  const prev = lastTrackingEmitAt.get(key) || 0;
  if (now - prev < TRACKING_EMIT_THROTTLE_MS) {
    return false;
  }
  lastTrackingEmitAt.set(key, now);
  return true;
}

function notifyTrackingClients({ organisation, user, timesheetDay, type }) {
  if (!organisation?.id || !user?.id) return;
  if (!shouldEmitTrackingLive(timesheetDay?.id, type)) return;
  try {
    emitTrackingUpdated(
      organisation.id,
      {
        id: timesheetDay?.timesheet_id ?? timesheetDay?.id ?? user.id,
        organisation_id: organisation.id,
        employee_id: organisation.employee?.id ?? null,
        timesheet_id: timesheetDay?.timesheet_id ?? null,
        timesheet_day_id: timesheetDay?.id ?? null,
        user_id: user.id,
        type: type || null,
      },
      user.id,
    );
  } catch (err) {
    console.error(
      "emitTrackingUpdated failed",
      err?.message || err,
    );
  }
}

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

async function startNewActivity(activityType, ctx, t, jobId = null) {
  if (!activityType) return;
  return createActivityLog(
    {
      ...ctx,
      start_at: ctx.currentUTCTime,
      end_at: null,
      type_id: activityType.id,
      job_id: jobId ?? null,
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
    remarks = null,
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

  const trimmedRemarks =
    typeof remarks === "string" && remarks.trim() ? remarks.trim() : null;

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
      remarks: trimmedRemarks,
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

/**
 * Geofence against jobs assigned to the employee's current timesheet
 * (`timesheet_jobs` / legacy `job_id`). Falls back to all org jobs only when
 * no timesheet/job assignment exists (should not happen after validate).
 */
async function fetchJobsForOrganisation(organisation, t, timesheetDay = null) {
  let jobIds = [];

  const timesheetId = timesheetDay?.timesheet_id;
  if (timesheetId) {
    const junction = await TimesheetJobs.findAll({
      attributes: ["job_id"],
      where: {
        organisation_id: organisation.id,
        timesheet_id: timesheetId,
      },
      transaction: t,
      raw: true,
    });
    jobIds = junction.map((r) => r.job_id).filter(Boolean);

    if (jobIds.length === 0) {
      const ts = await Timesheets.findOne({
        attributes: ["job_id"],
        where: { id: timesheetId, organisation_id: organisation.id },
        transaction: t,
        raw: true,
      });
      if (ts?.job_id) jobIds = [ts.job_id];
    }
  }

  const where = { organisation_id: organisation.id };
  if (timesheetId) {
    if (jobIds.length === 0) {
      return [];
    }
    where.id = { [Op.in]: jobIds };
  }

  return Jobs.scope({ method: ["withEmployee", {}] })
    .findAll({
      where,
      transaction: t,
    })
    .then((rows) => rows.map((r) => r.toJSON()));
}

async function assertNoActiveTrackerInOtherOrg(userId, organisationId, t) {
  const otherOrgRows = await TimesheetActivityLogs.findAll({
    attributes: ["organisation_id"],
    where: {
      user_id: userId,
      organisation_id: { [Op.ne]: organisationId },
      type_id: { [Op.ne]: null },
    },
    group: ["organisation_id"],
    transaction: t,
    raw: true,
  });

  let open = null;
  for (const row of otherOrgRows) {
    const candidate = await getOpenTypedActivity({
      userId,
      organisationId: row.organisation_id,
      transaction: t,
    });
    if (candidate) {
      open = candidate;
      break;
    }
  }

  if (!open) return;

  const org = await Organisations.findOne({
    attributes: ["id", "name", "code"],
    where: { id: open.organisation_id },
    transaction: t,
    raw: true,
  });

  const err = new AppError(
    "You already have an active tracker in another organisation.",
    409,
  );
  err.code = "TRACKING_OTHER_ORG_ACTIVE";
  err.meta = {
    organisation_code: org?.code || null,
    organisation_name: org?.name || null,
  };
  throw err;
}

/**
 * Activity logs are paired rows: START (start_at set, end_at null) then END
 * (start_at null, end_at set). The current activity is open only when the
 * latest typed row for that scope is a START row.
 */
function isOpenActivityRow(row) {
  return Boolean(row && row.start_at != null && row.end_at == null);
}

async function getLatestTypedActivity({
  userId,
  organisationId = null,
  organisationIdNe = null,
  trackAtBetween = null,
  transaction = null,
}) {
  const where = {
    user_id: userId,
    type_id: { [Op.ne]: null },
  };
  if (organisationId != null) {
    where.organisation_id = organisationId;
  } else if (organisationIdNe != null) {
    where.organisation_id = { [Op.ne]: organisationIdNe };
  }
  if (trackAtBetween) {
    where.track_at = { [Op.between]: trackAtBetween };
  }

  const row = await TimesheetActivityLogs.findOne({
    include: [{ model: TimesheetActivityTypes, as: "type" }],
    where,
    order: [
      ["id", "DESC"],
    ],
    transaction,
  });
  return row?.toJSON?.() ?? row ?? null;
}

async function getOpenTypedActivity(opts) {
  const latest = await getLatestTypedActivity(opts);
  return isOpenActivityRow(latest) ? latest : null;
}

/**
 * Build timer + current activity snapshot for API responses.
 */
async function getActivityStatus({ userId, organisationId, userTimezone }) {
  const userTz = userTimezone || "UTC";
  const startOfDayUTC = moment.tz(userTz).startOf("day").utc().format();
  const endOfDayUTC = moment.tz(userTz).endOf("day").utc().format();

  const activityTypes = await TimesheetActivityTypes.findAll({
    where: { code: ["travel", "working"] },
    raw: true,
  });
  const activityTypeIds = activityTypes.map((t) => t.id);

  const logs = await TimesheetActivityLogs.findAll({
    where: {
      user_id: userId,
      organisation_id: organisationId,
      type_id: activityTypeIds,
      track_at: { [Op.between]: [startOfDayUTC, endOfDayUTC] },
    },
    order: [
      ["track_at", "ASC"],
      ["id", "ASC"],
    ],
    raw: true,
  });

  let totalSeconds = 0;
  let currentStart = null;
  for (const log of logs) {
    if (log.start_at && !currentStart) {
      currentStart = new Date(log.start_at);
    }
    if (log.end_at && currentStart) {
      const diffSeconds = Math.round(
        (new Date(log.end_at) - currentStart) / 1000,
      );
      if (diffSeconds > 0) totalSeconds += diffSeconds;
      currentStart = null;
    }
  }
  if (currentStart) {
    const diffSeconds = Math.round((Date.now() - currentStart.getTime()) / 1000);
    if (diffSeconds > 0) totalSeconds += diffSeconds;
  }

  const plain = await getLatestTypedActivity({
    userId,
    organisationId,
    trackAtBetween: [startOfDayUTC, endOfDayUTC],
  });

  const typeCode = plain?.type?.code || null;
  const typeName = plain?.type?.name || null;
  const isOpen = isOpenActivityRow(plain);

  let timer = "stop";
  let status = "Stopped";
  if (isOpen && ["travel", "working"].includes(typeCode)) {
    timer = "running";
    status = typeName || (typeCode === "travel" ? "Travel" : "Working");
  } else if (isOpen && typeCode === "break") {
    timer = "pause";
    status = "Paused";
  }

  return {
    total_hours: Number((totalSeconds / 3600).toFixed(3)),
    total_seconds: totalSeconds,
    timer,
    status,
    current_activity: isOpen && typeCode
      ? {
          code: typeCode,
          name: typeName,
          job_id: plain?.job_id ?? null,
        }
      : null,
  };
}

function findMatchingJob(latitude, longitude, jobs) {
  for (const job of jobs) {
    const lat = Number(job?.address?.latitude);
    const lng = Number(job?.address?.longitude);
    const radius = Number(job?.radius);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(radius)
    ) {
      continue;
    }
    if (isInsideRadius(latitude, longitude, lat, lng, radius)) {
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

    const startLog = await startNewActivity(travelType, ctx, t, null);

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
  remarks = null,
  authenticatedUser = null,
}) {
  // Start transaction early (we will rollback on any early return)
  const transaction = await db.transaction();

  try {
    if (typeof location === "string") location = JSON.parse(location);

    if (!organisationCode) {
      await transaction.rollback();
      throw new AppError("Organisation code is required!", 400);
    }

    if (!authenticatedUser?.id) {
      await transaction.rollback();
      throw new AppError(
        "Tracking authentication required. Sign in again on the device.",
        401,
      );
    }

    if (
      userId != null &&
      String(userId) !== "" &&
      Number(userId) !== Number(authenticatedUser.id)
    ) {
      await transaction.rollback();
      throw new AppError("Unauthorized request!", 400);
    }

    const userResponse = await Auth.getUser(authenticatedUser.id);
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

    if (!organisation || !organisation?.employee?.id) {
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

    const lastActivity = await getLatestTypedActivity({
      userId: user.id,
      organisationId: organisation.id,
      transaction,
    });
    const lastActivityType = lastActivity?.type || null;
    const hasOpenActivity = isOpenActivityRow(lastActivity);

    const buildStatus = async () =>
      getActivityStatus({
        userId: user.id,
        organisationId: organisation.id,
        userTimezone: user?.timezone?.timezone || "UTC",
      });

    /* ============================================================================
     * IF TYPE PRESENT (start / pause / resume / stop) - MANUAL ACTIONS
     * ============================================================================
     */
    if (type) {
      const jobs = await fetchJobsForOrganisation(
        organisation,
        transaction,
        timesheetDay,
      );
      const matchedJob = findMatchingJob(latitude, longitude, jobs);

      const workingType = await getActivityType("working", transaction);
      const travelType = await getActivityType("travel", transaction);
      const breakType = await getActivityType("break", transaction);

      // Before handling actions -> auto EXIT check
      await processAutoExit(
        {
          lastActivityType: hasOpenActivity ? lastActivityType : null,
          matchedJob,
          ctx,
          workingType,
          travelType,
          organisation,
          user,
          timesheetDay,
          lastActivity: hasOpenActivity ? lastActivity : null,
        },
        transaction,
      );

      switch (type) {
        case "start": {
          await assertNoActiveTrackerInOtherOrg(
            user.id,
            organisation.id,
            transaction,
          );

          // Prevent duplicate start when already working on same job
          if (
            hasOpenActivity &&
            matchedJob &&
            lastActivityType?.code === "working" &&
            lastActivity?.job_id === matchedJob.id
          ) {
            await transaction.commit();
            notifyTrackingClients({ organisation, user, timesheetDay, type });
            return buildStatus();
          }

          // Already running travel/working in this org — treat as idempotent
          if (
            hasOpenActivity &&
            lastActivityType &&
            ["travel", "working"].includes(lastActivityType.code)
          ) {
            await transaction.commit();
            notifyTrackingClients({ organisation, user, timesheetDay, type });
            return buildStatus();
          }

          // Close a dangling break before starting fresh
          if (hasOpenActivity && lastActivityType?.code === "break") {
            await endLastActivity(lastActivityType, ctx, transaction);
            if (timesheetDay) {
              await updateLastDayTaskEndTime(
                {
                  organisation,
                  user,
                  timesheetDay,
                  end_time: ctx.currentUTCTime,
                  timesheet_activity_log_end_id: null,
                },
                transaction,
              );
            }
          }

          const activityType = matchedJob ? workingType : travelType;
          const startLog = await startNewActivity(
            activityType,
            ctx,
            transaction,
            matchedJob?.id ?? null,
          );

          if (timesheetDay) {
            if (matchedJob) {
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
          if (
            !hasOpenActivity ||
            !lastActivityType ||
            ["break"].includes(lastActivityType.code)
          )
            break;
          const endLog = await endLastActivity(
            lastActivityType,
            ctx,
            transaction,
          );
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
              null,
            );

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
                remarks,
              },
              transaction,
            );
          }
          break;
        }

        case "resume": {
          if (!hasOpenActivity || lastActivityType?.code !== "break") break;
          const endLog = await endLastActivity(
            lastActivityType,
            ctx,
            transaction,
          );
          const jobsNow = await fetchJobsForOrganisation(
            organisation,
            transaction,
            timesheetDay,
          );
          const matchedJobNow = findMatchingJob(latitude, longitude, jobsNow);
          const nextType = matchedJobNow ? workingType : travelType;

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

            let nextJobId = null;
            let nextIsTravel = false;

            if (
              lastTaskMeta &&
              lastTaskMeta.job_id &&
              !lastTaskMeta.was_break &&
              !lastTaskMeta.was_travel
            ) {
              nextJobId = lastTaskMeta.job_id;
              nextIsTravel = false;
            } else if (matchedJobNow) {
              nextJobId = matchedJobNow.id;
              nextIsTravel = false;
            } else {
              nextJobId = null;
              nextIsTravel = true;
            }

            const startLog = await startNewActivity(
              nextType,
              ctx,
              transaction,
              nextJobId,
            );

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
          } else {
            await startNewActivity(
              nextType,
              ctx,
              transaction,
              matchedJobNow?.id ?? null,
            );
          }
          break;
        }

        case "stop": {
          let endLog = null;
          if (hasOpenActivity && lastActivityType) {
            endLog = await endLastActivity(lastActivityType, ctx, transaction);
          }

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

      await transaction.commit();
      notifyTrackingClients({ organisation, user, timesheetDay, type });
      return buildStatus();
    }

    /* ============================================================================
     * BACKGROUND TRACKING (TYPE = null) - AUTOMATIC GEO-FENCE HANDLING
     * ============================================================================
     */
    const jobs = await fetchJobsForOrganisation(
      organisation,
      transaction,
      timesheetDay,
    );
    const matchedJob = findMatchingJob(latitude, longitude, jobs);

    const workingType = await getActivityType("working", transaction);
    const travelType = await getActivityType("travel", transaction);

    const exitTriggered = await processAutoExit(
      {
        lastActivityType: hasOpenActivity ? lastActivityType : null,
        matchedJob,
        ctx,
        workingType,
        travelType,
        organisation,
        user,
        timesheetDay,
        lastActivity: hasOpenActivity ? lastActivity : null,
      },
      transaction,
    );

    if (!exitTriggered && matchedJob && timesheetDay) {
      if (
        hasOpenActivity &&
        lastActivityType?.code === "working" &&
        lastActivity?.job_id === matchedJob.id
      ) {
        // already inside same job
      } else if (hasOpenActivity && lastActivityType?.code === "travel") {
        const endLog = await endLastActivity(
          lastActivityType,
          ctx,
          transaction,
        );

        const startLog = await startNewActivity(
          workingType,
          ctx,
          transaction,
          matchedJob.id,
        );

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
      } else if (!hasOpenActivity) {
        const startLog = await startNewActivity(
          workingType,
          ctx,
          transaction,
          matchedJob.id,
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
      } else {
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
            matchedJob.id,
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

    await createActivityLog(
      {
        ...ctx,
        start_at: null,
        end_at: null,
        type_id: null,
        job_id: matchedJob?.id ?? null,
      },
      transaction,
    );

    await redisUtils.delCache(
      `timesheet_day:${organisation?.id}:${organisation?.employee?.id}:${timesheetDay?.id}`,
    );

    await transaction.commit();
    notifyTrackingClients({ organisation, user, timesheetDay, type });
    return buildStatus();
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
  getActivityStatus,
};
