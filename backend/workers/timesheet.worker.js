import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { Timesheets, TimesheetStatus, Employees, EarningRates } = models;
import axios from "axios";
import xeroService from "../service/xero.service.js";
import timesheetService from "../service/timsheet.service.js";
import timesheetRateService from "../service/timesheet-rate.service.js";

const worker = new Worker(
  "timesheetQueue",
  async (job) => {
    if (job.name !== "push-single-timesheet") return;

    const { user, organisation, systemTimesheetId, status, isBulk, batchId } =
      job.data;
    console.log(`Job ${job.id} processing pushing timesheets to xero`);

    await pushTimesheetToXero(
      user,
      organisation,
      systemTimesheetId,
      status,
      isBulk,
      batchId
    );

    return { success: true };
  },
  {
    connection: redis,
    concurrency: 3, // Xero-safe
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

async function pushTimesheetToXero(
  user,
  organisation,
  systemTimesheetId,
  status,
  isBulk,
  batchId
) {
  const batchKey = batchId ? `xero:timesheet:batch:${batchId}` : null;
  try {
    const systemTimesheet = await Timesheets.findOne({
      where: {
        id: systemTimesheetId,
        organisation_id: organisation.id,
      },
    });

    const timesheetResponse = await timesheetService.getTimesheetDays(null, {
      organisation_id: organisation.id,
      id: systemTimesheet.id,
      employee_id: systemTimesheet.employee_id,
    });

    const timesheetData = timesheetResponse?.data;
    if (!timesheetData)
      return { success: false, error: "Timesheet data not found!" };

    const employee = await Employees.scope("defaultScope").findOne({
      where: {
        organisation_id: organisation.id,
        id: systemTimesheet.employee_id,
      },
    });

    if (!employee) return { success: false, error: "Employee not found!" };

    const timesheetDaysRate = await timesheetRateService.calculate({
      organisation,
      timesheet_id: timesheetData.id,
      employee_id: employee.id,
      from: timesheetData.period_start_date,
      to: timesheetData.period_end_date,
    });

    const totalDays = timesheetDaysRate.length;
    let linesMap = {};

    for (let i = 0; i < totalDays; i++) {
      const day = timesheetDaysRate[i];
      let earningRateId;

      if (day.earning_rate_id) {
        const rate = await EarningRates.findByPk(day.earning_rate_id);

        if (!rate.xero_earning_rate_id) {
          const xeroRate = await xeroService.pushSystemEarningRateToXero(
            user,
            organisation,
            rate
          );
          rate.xero_earning_rate_id = xeroRate.earningsRateID;
          await rate.save();
        }

        earningRateId = rate.xero_earning_rate_id;
      } else {
        earningRateId =
          organisation.settings.default_ordinary_hours_earning_rate_type
            ?.earningsRateID;
      }

      if (!linesMap[earningRateId]) {
        linesMap[earningRateId] = {
          earningsRateID: earningRateId,
          numberOfUnits: Array(totalDays).fill(0),
        };
      }

      linesMap[earningRateId].numberOfUnits[i] =
        day.total_working_hours_in_decimal || 0;
    }

    const xeroTimesheet = await xeroService.pushSystemTimesheetToXero(
      user,
      organisation,
      timesheetData,
      Object.values(linesMap),
      employee.toJSON(),
      status
    );

    systemTimesheet.xero_timesheet_id = xeroTimesheet.timesheetID;
    await systemTimesheet.save();

    // SINGLE → notify immediately
    if (!isBulk) {
      await sendNotification(
        user,
        "Timesheet successfully synced to Xero",
        `${systemTimesheet.code} timesheet has been successfully pushed to Xero.`
      );
    }
    // BULK → track success
    if (isBulk) {
      await redis.hincrby(batchKey, "success", 1);
    }
    return true;
  } catch (err) {
    console.error("Error pushing data to xero", err);
    if (!isBulk) {
      await sendNotification(
        user,
        "Timesheet can not synced to Xero",
        `Error: ${err.message}`
      );
    }
    if (isBulk) {
      await redis.hincrby(batchKey, "failed", 1);
    }

    return { success: false, error: err.message };
  } finally {
    // BULK → check completion
    if (isBulk) {
      const batch = await redis.hgetall(batchKey);
      const done = Number(batch.success) + Number(batch.failed);

      if (done === Number(batch.total)) {
        await sendBatchNotification(user, batch);
        await redis.del(batchKey);
      }
    }
  }
}

async function sendNotification(user, title, body) {
  axios
    .post(
      `${process.env.SERVER_URL}/notifications/send`,
      {
        user_ids: [user?.id],
        message: { title: title, body: body },
      },
      {
        headers: { Authorization: `Bearer ${user?.token}` },
        // timeout: 5000, // optional
      }
    )
    .catch((error) => {
      console.log("sendNotificationWorkerError::", error);
    });
}

async function sendBatchNotification(user, batch) {
  const { total, success, failed } = batch;

  if (Number(failed) === 0) {
    await sendNotification(
      user,
      "All timesheets synced to Xero",
      `${success} timesheets were successfully pushed to Xero.`
    );
  } else {
    await sendNotification(
      user,
      "Timesheets sync completed with errors",
      `${success}/${total} succeeded, ${failed} failed.`
    );
  }
}

// ⬇️ ADD THIS AT THE END
console.log(
  "✅ push timesheets to xero worker started and waiting for jobs..."
);
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down push timesheets to xero worker...");
  await worker.close();
  process.exit(0);
});
