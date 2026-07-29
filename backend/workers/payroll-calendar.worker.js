import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { PayrollCalendars, PayCycles } = models;
import axios from "axios";
import xeroService from "../service/xero.service.js";

const worker = new Worker(
  "payrollCalendarQueue",
  async (job) => {
    if (job.name !== "push-single-payroll-calendar") return;

    const { user, organisation, payrollCalendar, payCycle, isBulk, batchId } =
      job.data;
    console.log(`Job ${job.id} processing pushing payroll calendar to xero`);

    await pushPayrollCalendarToXero(
      user,
      organisation,
      payrollCalendar,
      payCycle,
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

async function pushPayrollCalendarToXero(
  user,
  organisation,
  payrollCalendar,
  payCycle,
  isBulk,
  batchId
) {
  const batchKey = batchId ? `xero:payrollcalendar:batch:${batchId}` : null;
  try {
    const xeroPayrollCalendar =
      await xeroService.pushSystemPayrollCalendarToXero(
        user,
        organisation,
        payrollCalendar,
        payCycle
      );
    // update database table
    let existingPayrollCalendar = await PayrollCalendars.findOne({
      where: {
        id: payrollCalendar.id,
        organisation_id: organisation.id,
      },
    });

    existingPayrollCalendar.xero_payroll_calendar_id =
      xeroPayrollCalendar?.payrollCalendarID;
    await existingPayrollCalendar.save();

    // SINGLE → notify immediately
    if (!isBulk) {
      await sendNotification(
        user,
        "Payroll calendar successfully synced to Xero",
        `${payrollCalendar.name} payroll calendar has been successfully pushed to Xero.`
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
        "Payroll calendar can not synced to Xero",
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
      "All payroll calendars synced to Xero",
      `${success} payroll calendars were successfully pushed to Xero.`
    );
  } else {
    await sendNotification(
      user,
      "Payroll calendars sync completed with errors",
      `${success}/${total} succeeded, ${failed} failed.`
    );
  }
}

// ⬇️ ADD THIS AT THE END
console.log(
  "✅ push payroll calendars to xero worker started and waiting for jobs..."
);
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log(
    "🛑 Gracefully shutting down push payroll calendars to xero worker..."
  );
  await worker.close();
  process.exit(0);
});
