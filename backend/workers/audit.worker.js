import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import { writeAuditRecord } from "../service/audit/audit.persist.js";

const worker = new Worker(
  "auditQueue",
  async (job) => {
    if (job.name !== "write-audit") return;
    const { type, payload } = job.data || {};
    await writeAuditRecord(type, payload);
    return { success: true };
  },
  {
    connection: redis,
    concurrency: 10,
  },
);

worker.on("failed", (job, err) => {
  console.error(`audit worker job ${job?.id} failed:`, err?.message || err);
});

console.log("audit worker started");
process.stdin.resume();
process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
