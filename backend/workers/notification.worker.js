import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import axios from "axios";

const worker = new Worker(
  "notificationQueue",
  async (job) => {
    if (job.name !== "send-notification") return;
    const { user, sentToUserIds, message, url } = job.data;
    console.log(`Job ${job.id} processing sending notifications`);

    await sendNotification(user, sentToUserIds, message, url);

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

async function sendNotification(user, sentToUserIds, message, url) {
  if (sentToUserIds?.length > 0) {
    axios
      .post(
        `${process.env.SERVER_URL}/notifications/send`,
        {
          user_ids: sentToUserIds,
          message: message,
          url: url,
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
}

// ⬇️ ADD THIS AT THE END
console.log("✅ send notification worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down send notification worker...");
  await worker.close();
  process.exit(0);
});
