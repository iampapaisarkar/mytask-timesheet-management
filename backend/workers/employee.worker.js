import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { Employees } = models;
import axios from "axios";
import xeroService from "../service/xero.service.js";

const worker = new Worker(
  "employeeQueue",
  async (job) => {
    if (job.name !== "push-single-employee") return;

    const { user, organisation, employee, isBulk, batchId } = job.data;
    console.log(`Job ${job.id} processing pushing employees to xero`);

    await pushEmployeeToXero(user, organisation, employee, isBulk, batchId);

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

async function pushEmployeeToXero(
  user,
  organisation,
  employee,
  isBulk,
  batchId
) {
  const batchKey = batchId ? `xero:employee:batch:${batchId}` : null;
  try {
    const xeroEmployee = await xeroService.pushSystemEmployeeToXero(
      user,
      organisation,
      employee
    );
    // update database table
    let existingEmployee = await Employees.findOne({
      where: {
        id: employee?.details.id,
        organisation_id: organisation.id,
      },
    });

    existingEmployee.xero_employee_id = xeroEmployee?.employeeID;
    await existingEmployee.save();

    // SINGLE → notify immediately
    if (!isBulk) {
      await sendNotification(
        user,
        "Employee successfully synced to Xero",
        `${employee?.details.first_name} employee has been successfully pushed to Xero.`
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
        "Employee can not synced to Xero",
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
      "All employees synced to Xero",
      `${success} employees were successfully pushed to Xero.`
    );
  } else {
    await sendNotification(
      user,
      "Employees sync completed with errors",
      `${success}/${total} succeeded, ${failed} failed.`
    );
  }
}

// ⬇️ ADD THIS AT THE END
console.log(
  "✅ push earning rates to xero worker started and waiting for jobs..."
);
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down push employees to xero worker...");
  await worker.close();
  process.exit(0);
});
