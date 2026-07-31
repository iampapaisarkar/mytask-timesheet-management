import "./workers/location.worker.js";
import "./workers/email.worker.js";
import "./workers/notification.worker.js";
import "./workers/report.worker.js";
import "./workers/audit.worker.js";
import "./workers/subscription.worker.js";
import { runAuditRetentionCleanup } from "./queue-jobs/audit-retention.job.js";
import { subscriptionQueue } from "./queue/subscription.queue.js";

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

/** Subscription expiry reminders — daily. */
const SUB_REMINDER_MS = 24 * 60 * 60 * 1000;
setTimeout(() => {
  void subscriptionQueue
    .add("expiry-reminders", {}, { jobId: `expiry-${Date.now()}` })
    .catch((err) =>
      console.error("subscription reminders:", err?.message || err),
    );
}, 30_000);
setInterval(() => {
  void subscriptionQueue
    .add("expiry-reminders", {}, { removeOnComplete: true })
    .catch((err) =>
      console.error("subscription reminders:", err?.message || err),
    );
}, SUB_REMINDER_MS);

/** Weekly webhook log cleanup */
const WEBHOOK_CLEANUP_MS = 7 * 24 * 60 * 60 * 1000;
setInterval(() => {
  void subscriptionQueue
    .add("webhook-cleanup", {}, { removeOnComplete: true })
    .catch((err) => console.error("webhook cleanup:", err?.message || err));
}, WEBHOOK_CLEANUP_MS);
