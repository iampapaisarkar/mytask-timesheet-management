import { Worker } from "bullmq";
import redis from "../functions/ioredisService.js";
import models from "../models/index.js";
const { Users } = models;
import moment from "moment";
import { NodeMailer } from "#nodemailer";

const worker = new Worker(
  "mailQueue",
  async (job) => {
    const { userEmails, message } = job.data;
    console.log(`Job ${job.id} processing sending emails`);

    await sendMail(userEmails, message);

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

async function sendMail(userEmails, message) {
  try {
    const response = await NodeMailer.send(userEmails, message);
    return true;
  } catch (err) {
    console.error("Error sending email", err);
    throw err;
  }
}

// ⬇️ ADD THIS AT THE END
console.log("✅ send mail worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down send mail worker...");
  await worker.close();
  process.exit(0);
});
