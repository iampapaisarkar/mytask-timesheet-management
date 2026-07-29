import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import { NodeMailer } from "#nodemailer";

const worker = new Worker(
  "mailQueue",
  async (job) => {
    if (job.name !== "send-mail") return;
    const { user, organisation, userEmails, message } = job.data;
    console.log(`Job ${job.id} processing sending emails`);

    await sendMail(user, organisation, userEmails, message);

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

async function sendMail(user, organisation, userEmails, message) {
  try {
    const response = await NodeMailer.send(
      user,
      organisation,
      userEmails,
      message,
    );
    if (!response?.success) {
      throw new Error(response?.message || "Email send failed");
    }
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
