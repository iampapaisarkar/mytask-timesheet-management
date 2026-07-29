// timesheet-activity.controller.js
import { Op } from "sequelize";
import moment from "moment-timezone";
import models from "../models/index.js";
import timesheetActivityService from "../service/timesheet-activity.service.js";
import { enqueueStoreLocation } from "../queue-jobs/store-location.job.js";

const {
  Timesheets,
  TimesheetStatus,
  TimesheetActivityLogs,
  TimesheetActivityTypes,
} = models;

export async function store(req, res) {
  let { location, type, organisationCode, userId, fcmToken } = req.body;
  try {
    await timesheetActivityService.storeLocation({
      location,
      type,
      organisationCode,
      userId,
      fcmToken,
    });
    return res.status(200).json({});
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to store location. Please ty again later.",
    });
  }
}

export async function sendLocation(req, res) {
  let { location, type, organisationCode, userId, fcmToken } = req.body;
  try {
    await enqueueStoreLocation({
      location,
      type,
      organisationCode,
      userId,
      fcmToken,
    });
    return res.status(200).json({
      message: "Location store successfully",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to store location. Please ty again later.",
    });
  }
}

export async function activity(req, res) {
  let { user, organisation } = req.body;
  try {
    const userTz = user?.timezone?.timezone || "UTC";

    // 1. Get user day start/end in their timezone
    const startOfDayUserTZ = moment.tz(userTz).startOf("day");
    const endOfDayUserTZ = moment.tz(userTz).endOf("day");

    // 2. Convert to UTC for DB query
    const startOfDayUTC = startOfDayUserTZ.clone().utc().format();
    const endOfDayUTC = endOfDayUserTZ.clone().utc().format();

    // 3. Get activity types
    const activityTypes = await TimesheetActivityTypes.findAll({
      where: { code: ["travel", "working"] },
      raw: true,
    });

    const activityTypeIds = activityTypes.map((t) => t.id);

    // 4. Fetch logs (now filtered by user's day)
    let logs = await TimesheetActivityLogs.findAll({
      where: {
        user_id: user.id,
        organisation_id: organisation.id,
        type_id: activityTypeIds,
        track_at: {
          [Op.between]: [startOfDayUTC, endOfDayUTC],
        },
      },
      order: [
        ["track_at", "ASC"],
        ["id", "ASC"],
      ],
      raw: true,
    });

    // 5. Convert timestamps to user's timezone for final output
    logs = logs.map((log) => ({
      ...log,
      track_at: moment(log.track_at).tz(userTz).format(),
      start_at: log.start_at ? moment(log.start_at).tz(userTz).format() : null,
      end_at: log.end_at ? moment(log.end_at).tz(userTz).format() : null,
    }));

    // 6. Duration calculations (no change)
    let totalSeconds = 0;
    let currentStart = null;

    for (const log of logs) {
      if (log.start_at && !currentStart) {
        currentStart = new Date(log.start_at);
      }

      if (log.end_at && currentStart) {
        const end = new Date(log.end_at);

        // Round milliseconds → nearest second
        const diffSeconds = Math.round((end - currentStart) / 1000);

        if (diffSeconds > 0) totalSeconds += diffSeconds;
        currentStart = null;
      }
    }

    // Handle OPEN session
    if (currentStart) {
      const now = new Date();

      const diffSeconds = Math.round((now - currentStart) / 1000);

      if (diffSeconds > 0) totalSeconds += diffSeconds;
    }

    const totalHoursRounded = Number((totalSeconds / 3600).toFixed(3));

    // Get CURRENT activity
    const currentActivity = await TimesheetActivityLogs.findOne({
      include: [{ model: TimesheetActivityTypes, as: "type" }],
      where: {
        user_id: user.id,
        organisation_id: organisation.id,
        type_id: { [Op.ne]: null },
        track_at: {
          [Op.between]: [startOfDayUTC, endOfDayUTC],
        },
      },
      order: [
        ["track_at", "DESC"],
        ["id", "DESC"],
      ],
      raw: true,
    });

    let timer = "stop";

    if (currentActivity && currentActivity?.end_at == null) {
      if (["travel", "working"].includes(currentActivity["type.code"])) {
        timer = "running";
      } else if (currentActivity["type.code"] === "break") {
        timer = "pause";
      }
    }

    return res.status(200).json({
      data: {
        total_hours: totalHoursRounded,
        total_seconds: totalSeconds,
        timer,
      },
    });
  } catch (err) {
    console.error("Error in activity():", err);
    return res.status(500).json({
      message: "Unable to fetch user's timesheet activity!",
      details: err?.message,
    });
  }
}

export async function timesheetValidation(req, res) {
  let { user, organisation } = req.body;
  try {
    const today = moment().startOf("day").toDate();

    const timesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
        period_start_date: {
          [Op.lte]: today,
        },
        period_end_date: {
          [Op.gte]: today,
        },
      },
      include: [
        {
          model: TimesheetStatus,
          as: "status",
        },
      ],
      raw: true,
      nest: true,
    });

    if (timesheet) {
      if (timesheet.status.code == "draft") {
        return res.status(200).json({});
      } else {
        return res.status(500).json({
          message: "Timesheet already submitted.",
        });
      }
    } else {
      return res
        .status(500)
        .json({ message: "There is no timesheet available." });
    }
  } catch (err) {
    console.error("Error in timesheetValidation():", err);
    return res.status(500).json({
      message: "Unable to validate timesheet!",
      details: err?.message,
    });
  }
}

import axios from "axios";
import fs from "fs";

const locations = JSON.parse(
  fs.readFileSync(new URL("../simulate_locations2.json", import.meta.url))
);

// Helper sleep function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulate(req, res) {
  try {
    for (const location of locations) {
      const response = await axios.post(
        `${process.env.SERVER_URL}/timesheet-activity/send-location`,
        location
      );
      // console.log("Posted location response:", response);

      // Wait 1 second before next iteration
      await sleep(15000);
    }

    return res.status(200).json({ message: "All locations posted!" });
  } catch (err) {
    // console.error("Error in simulateTestLocation():", err);
    return res.status(500).json({
      message: "Unable to simulate test location!",
      details: err?.message,
    });
  }
}
