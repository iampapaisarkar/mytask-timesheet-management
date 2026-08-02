// timesheet-activity.controller.js
import { Op } from "sequelize";
import moment from "moment-timezone";
import models from "../models/index.js";
import timesheetActivityService from "../service/timesheet-activity.service.js";
import { enqueueStoreLocation } from "../queue-jobs/store-location.job.js";

const {
  Timesheets,
  TimesheetStatus,
  TimesheetJobs,
} = models;

function activityErrorPayload(err) {
  return {
    code: err.code || undefined,
    message:
      err.message || "Unable to store location. Please try again later.",
    ...(err.meta ? { meta: err.meta } : {}),
  };
}

export async function store(req, res) {
  let { location, type, organisationCode, userId, remarks, user } = req.body;
  try {
    const status = await timesheetActivityService.storeLocation({
      location,
      type,
      organisationCode: organisationCode || req.body?.organisation?.code,
      userId: userId || user?.id,
      remarks,
      authenticatedUser: user || null,
    });
    return res.status(200).json({
      data: status && typeof status === "object" ? status : {},
      message: "Location stored successfully",
    });
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json(activityErrorPayload(err));
  }
}

export async function sendLocation(req, res) {
  let { location, type, organisationCode, userId, remarks, user } = req.body;
  try {
    await enqueueStoreLocation({
      location,
      type,
      organisationCode,
      userId: userId || user?.id,
      remarks,
      authenticatedUserId: user?.id || null,
    });
    return res.status(200).json({
      message: "Location store successfully",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to store location. Please try again later.",
    });
  }
}

export async function activity(req, res) {
  let { user, organisation } = req.body;
  try {
    const data = await timesheetActivityService.getActivityStatus({
      userId: user.id,
      organisationId: organisation.id,
      userTimezone: user?.timezone?.timezone || "UTC",
    });

    return res.status(200).json({ data });
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
    if (!organisation?.employee?.id) {
      return res.status(400).json({
        code: "NO_EMPLOYEE",
        message: "No employee profile found for this organisation.",
      });
    }

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
        {
          model: models.Jobs,
          as: "jobs",
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!timesheet) {
      return res.status(400).json({
        code: "NO_TIMESHEET",
        message: "There is no timesheet available for today.",
      });
    }

    const plain = timesheet.toJSON();
    if (plain.status?.code !== "draft") {
      return res.status(400).json({
        code: "TIMESHEET_NOT_DRAFT",
        message: "Timesheet already submitted.",
      });
    }

    const junctionJobs = Array.isArray(plain.jobs) ? plain.jobs : [];
    const hasJunctionJobs = junctionJobs.length > 0;
    const hasLegacyJob = Boolean(plain.job_id);

    if (!hasJunctionJobs && !hasLegacyJob) {
      // Also check timesheet_jobs directly in case association is empty
      const jobCount = await TimesheetJobs.count({
        where: {
          organisation_id: organisation.id,
          timesheet_id: plain.id,
        },
      });
      if (jobCount === 0) {
        return res.status(400).json({
          code: "NO_ASSIGNED_JOBS",
          message:
            "You need at least one assigned job on today's timesheet before tracking can start.",
        });
      }
    }

    return res.status(200).json({
      data: {
        timesheet_id: plain.id,
        job_count: hasJunctionJobs
          ? junctionJobs.length
          : hasLegacyJob
            ? 1
            : 0,
      },
    });
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
  fs.readFileSync(new URL("../simulate_locations2.json", import.meta.url)),
);

// Helper sleep function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulate(req, res) {
  try {
    for (const location of locations) {
      await axios.post(
        `${process.env.SERVER_URL}/timesheet-activity/send-location`,
        location,
      );

      // Wait before next iteration
      await sleep(15000);
    }

    return res.status(200).json({ message: "All locations posted!" });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to simulate test location!",
      details: err?.message,
    });
  }
}
