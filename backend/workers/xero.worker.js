import { Worker } from "bullmq";
import IORedis from "ioredis";
import redis from "../functions/ioredisService.js";
import models from "../models/index.js";
const { Users } = models;
import moment from "moment";
import { NodeMailer } from "#nodemailer";
import axios from "axios";
import xeroService from "../service/xero.service.js";

const worker = new Worker(
  "xeroQueue",
  async (job) => {
    const { user, organisation } = job.data;
    console.log(`Job ${job.id} processing pushing data to xero`);

    await pushDataToXero(user, organisation);

    return { success: true };
  },
  { connection: redis }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

async function pushDataToXero(user, organisation) {
  try {
    const xeroEarningRatesResponse =
      await xeroService.pushSystemAllEarningRatesToXero(user, organisation);

    axios
      .post(
        `${process.env.SERVER_URL}/notifications/send`,
        {
          user_id: user?.id,
          title: "Data Successfully Synced to Xero",
          body: "The MyTask data has been successfully pushed to Xero.",
        },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
          // timeout: 5000, // optional
        }
      )
      .catch((err) => console.error("Notification failed:", err));
    return true;
  } catch (err) {
    console.error("Error pushing data to xero", err);
    throw err;
  }
}

// ⬇️ ADD THIS AT THE END
console.log("✅ push to xero worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down push to xero worker...");
  await worker.close();
  process.exit(0);
});
