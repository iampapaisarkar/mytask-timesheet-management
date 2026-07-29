import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { EarningRates } = models;
import axios from "axios";
import xeroService from "../service/xero.service.js";
import awardRateService from "../service/award-rate.service.js";

const worker = new Worker(
  "earningRateQueue",
  async (job) => {
    if (job.name !== "push-single-earning-rate") return;

    const { user, organisation, earningRate, isBulk, batchId } = job.data;
    console.log(`Job ${job.id} processing pushing earning rates to xero`);

    await pushEarningRateToXero(
      user,
      organisation,
      earningRate,
      isBulk,
      batchId,
    );

    return { success: true };
  },
  {
    connection: redis,
    concurrency: 3, // Xero-safe
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

async function pushEarningRateToXero(
  user,
  organisation,
  earningRate,
  isBulk,
  batchId,
) {
  const batchKey = batchId ? `xero:earningrate:batch:${batchId}` : null;

  try {
    const xeroEarningRate = await xeroService.pushSystemEarningRateToXero(
      user,
      organisation,
      earningRate,
    );
    // update database table
    let existingEarningRate = await EarningRates.findOne({
      where: { id: earningRate.id, organisation_id: organisation.id },
    });

    existingEarningRate.xero_earning_rate_id = xeroEarningRate?.earningsRateID;
    await existingEarningRate.save();

    // SINGLE → notify immediately
    if (!isBulk) {
      await sendNotification(
        user,
        "Earning rate successfully synced to Xero",
        `${earningRate.name} earning rate has been successfully pushed to Xero.`,
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
        "Earning rate can not synced to Xero",
        `Error: ${err.message}`,
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
      },
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
      "All earning rates synced to Xero",
      `${success} earning rates were successfully pushed to Xero.`,
    );
  } else {
    await sendNotification(
      user,
      "Earning rates sync completed with errors",
      `${success}/${total} succeeded, ${failed} failed.`,
    );
  }
}

// ⬇️ ADD THIS AT THE END
console.log(
  "✅ push earning rates to xero worker started and waiting for jobs...",
);
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log(
    "🛑 Gracefully shutting down push earing rates to xero worker...",
  );
  await worker.close();
  process.exit(0);
});
