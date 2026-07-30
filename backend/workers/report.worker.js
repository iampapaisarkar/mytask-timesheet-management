import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import reportRequestService from "../service/report-request.service.js";

const worker = new Worker(
  "reportQueue",
  async (job) => {
    if (job.name !== "generate-report") return;
    const { reportRequestId } = job.data || {};
    console.log(`Report job ${job.id} processing request ${reportRequestId}`);
    await reportRequestService.processReportRequest(reportRequestId);
    return { success: true };
  },
  { connection: redis },
);

worker.on("completed", (job) => {
  console.log(`Report job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Report job ${job?.id} failed:`, err);
});

console.log("✅ report worker started and waiting for jobs...");
process.stdin.resume();
process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down report worker...");
  await worker.close();
  process.exit(0);
});
