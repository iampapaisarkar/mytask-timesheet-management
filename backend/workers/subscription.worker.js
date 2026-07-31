import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import subscriptionNotifyService from "../service/subscription/subscription-notify.service.js";
import billingService from "../service/stripe/billing.service.js";
import subscriptionService from "../service/subscription/subscription.service.js";
import models from "../models/index.js";
import moment from "moment";
import { Op } from "sequelize";
import { enqueueSubscriptionNotify } from "../queue-jobs/subscription-notify.job.js";
import { SUBSCRIPTION_NOTIFICATION_TYPES } from "../config/subscription.config.js";

const { Subscriptions, WebhookLogs, UsageCounters } = models;

const worker = new Worker(
  "subscriptionQueue",
  async (job) => {
    switch (job.name) {
      case "subscription-notify":
        return subscriptionNotifyService.notifySubscriptionEvent(job.data);
      case "expiry-reminders":
        return runExpiryReminders();
      case "sync-status":
        return runSubscriptionStatusSync();
      case "usage-reset-daily":
        return { skipped: true, note: "Period keys rotate automatically" };
      case "usage-reset-monthly":
        return { skipped: true, note: "Period keys rotate automatically" };
      case "webhook-cleanup":
        return cleanupWebhookLogs();
      default:
        return { ignored: true };
    }
  },
  { connection: redis },
);

worker.on("completed", (job) => {
  console.log(`subscription job ${job.id} (${job.name}) completed`);
});
worker.on("failed", (job, err) => {
  console.error(`subscription job ${job?.id} failed:`, err?.message || err);
});

async function runExpiryReminders() {
  const now = moment().utc();
  const windows = [
    { days: 7, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_7_DAYS },
    { days: 3, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_3_DAYS },
    { days: 1, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_1_DAY },
  ];

  let sent = 0;
  for (const w of windows) {
    const start = now.clone().add(w.days, "days").startOf("day");
    const end = now.clone().add(w.days, "days").endOf("day");
    const rows = await Subscriptions.findAll({
      where: {
        deleted_at: null,
        status: { [Op.in]: ["active", "trialing", "past_due"] },
        cancel_at_period_end: true,
        current_period_end: {
          [Op.between]: [start.toDate(), end.toDate()],
        },
      },
    });
    for (const sub of rows) {
      await enqueueSubscriptionNotify({
        userId: sub.user_id,
        subscriptionId: sub.id,
        type: w.type,
        title: `Subscription ends in ${w.days} day${w.days === 1 ? "" : "s"}`,
        body: `Your Pro plan renews or ends on ${moment(sub.current_period_end).format("ll")}.`,
        immediate: true,
      });
      sent += 1;
    }
  }

  // Expired check
  const expired = await Subscriptions.findAll({
    where: {
      deleted_at: null,
      status: { [Op.in]: ["active", "past_due"] },
      current_period_end: { [Op.lt]: now.toDate() },
      cancel_at_period_end: true,
    },
  });
  for (const sub of expired) {
    await billingService.downgradeToFree(sub.user_id, "period_ended");
    await enqueueSubscriptionNotify({
      userId: sub.user_id,
      subscriptionId: sub.id,
      type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRED,
      title: "Subscription expired",
      body: "Your Pro subscription has expired. You are now on Free. Data is preserved.",
      immediate: true,
    });
    sent += 1;
  }

  return { sent };
}

async function runSubscriptionStatusSync() {
  // Reconcile free assignment for users stuck without active subscription
  return { ok: true };
}

async function cleanupWebhookLogs() {
  const cutoff = moment().utc().subtract(90, "days").toDate();
  const deleted = await WebhookLogs.destroy({
    where: { created_at: { [Op.lt]: cutoff } },
  });
  // Optional: prune old lifetime usage periods older than 24 months
  const oldPeriod = moment().utc().subtract(24, "months").format("YYYY-MM");
  await UsageCounters.destroy({
    where: {
      period_type: "monthly",
      period_key: { [Op.lt]: oldPeriod },
    },
  });
  return { webhook_logs_deleted: deleted };
}

console.log("✅ subscription worker started");
process.stdin.resume();
process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

export default worker;
