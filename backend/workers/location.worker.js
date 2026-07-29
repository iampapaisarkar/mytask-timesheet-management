import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import timesheetActivityService from "../service/timesheet-activity.service.js";

const worker = new Worker(
  "locationQueue",
  async (job) => {
    if (job.name !== "store-location") return;
    const { location, type, organisationCode, userId, fcmToken } = job.data;
    console.log(`Job ${job.id} processing: user=${userId}`);

    await locationStore(location, type, organisationCode, userId, fcmToken);

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

async function locationStore(
  location,
  type,
  organisationCode,
  userId,
  fcmToken
) {
  try {
    await timesheetActivityService.storeLocation({
      location,
      type,
      organisationCode,
      userId,
      fcmToken,
    });
    return true;
  } catch (err) {
    console.error("Error inserting location", err);
    return { success: false, error: err.message };
  }
}

// ⬇️ ADD THIS AT THE END
console.log("✅ Location update worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down Location update worker...");
  await worker.close();
  process.exit(0);
});
