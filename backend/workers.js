// workers.js - Run all workers with one command

import "./workers/location.worker.js";
import "./workers/email.worker.js";
import "./workers/notification.worker.js";
import "./workers/report.worker.js";
import "./workers/audit.worker.js";
import { runAuditRetentionCleanup } from "./queue-jobs/audit-retention.job.js";

console.log("🚀 All workers started successfully...");

/** Daily retention sweep (default 90 days). */
const RETENTION_MS = 24 * 60 * 60 * 1000;
setTimeout(() => {
  void runAuditRetentionCleanup().catch((err) =>
    console.error("audit retention:", err?.message || err),
  );
}, 15_000);
setInterval(() => {
  void runAuditRetentionCleanup().catch((err) =>
    console.error("audit retention:", err?.message || err),
  );
}, RETENTION_MS);
