import { Worker } from "bullmq";
import redis from "../functions/redis-registry.js";
import subscriptionNotifyService from "../service/subscription/subscription-notify.service.js";
import billingService from "../service/stripe/billing.service.js";
import models from "../models/index.js";
import moment from "moment";
import { Op } from "sequelize";
import { enqueueSubscriptionNotify } from "../queue-jobs/subscription-notify.job.js";
import {
  SUBSCRIPTION_END_REASONS,
  SUBSCRIPTION_NOTIFICATION_TYPES,
  endReasonMessage,
} from "../config/subscription.config.js";
import { getStripe } from "../service/stripe/stripe.client.js";
import { getStripeConfig } from "../config/subscription.config.js";

const { Subscriptions, WebhookLogs, UsageCounters, StripeCustomers, Users } =
  models;

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

/**
 * Daily: 7/3/1-day cancel reminders + force Free when period ended.
 * Also catches past_due / unpaid Pro rows left without a webhook.
 */
async function runExpiryReminders() {
  const now = moment().utc();
  const windows = [
    { days: 7, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_7_DAYS },
    { days: 3, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_3_DAYS },
    { days: 1, type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRY_1_DAY },
  ];

  let sent = 0;
  let downgraded = 0;

  for (const w of windows) {
    const start = now.clone().add(w.days, "days").startOf("day");
    const end = now.clone().add(w.days, "days").endOf("day");
    const rows = await Subscriptions.findAll({
      where: {
        deleted_at: null,
        status: { [Op.in]: ["active", "trialing"] },
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
        body: `Your Pro plan ends on ${moment(sub.current_period_end).format("ll")}. After that you move to Free. Your data is preserved.`,
        forceEmail: true,
        metadata: { days: w.days, reason: "cancel_at_period_end" },
        immediate: true,
      });
      sent += 1;
    }
  }

  // Period ended (scheduled cancel)
  const expired = await Subscriptions.findAll({
    where: {
      deleted_at: null,
      status: { [Op.in]: ["active", "trialing", "past_due"] },
      current_period_end: { [Op.lt]: now.toDate() },
      cancel_at_period_end: true,
    },
  });
  for (const sub of expired) {
    await billingService.downgradeToFree(
      sub.user_id,
      SUBSCRIPTION_END_REASONS.PERIOD_ENDED,
    );
    await enqueueSubscriptionNotify({
      userId: sub.user_id,
      subscriptionId: sub.id,
      type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRED,
      title: "Subscription expired",
      body: endReasonMessage(SUBSCRIPTION_END_REASONS.PERIOD_ENDED),
      forceEmail: true,
      metadata: { reason: SUBSCRIPTION_END_REASONS.PERIOD_ENDED },
      immediate: true,
    });
    sent += 1;
    downgraded += 1;
  }

  // past_due / unpaid still showing as Pro rows → Free + notify
  const failedRows = await Subscriptions.findAll({
    where: {
      deleted_at: null,
      status: { [Op.in]: ["past_due", "unpaid"] },
      stripe_subscription_id: { [Op.ne]: null },
    },
  });
  for (const sub of failedRows) {
    const reason =
      sub.status === "unpaid"
        ? SUBSCRIPTION_END_REASONS.UNPAID
        : SUBSCRIPTION_END_REASONS.PAYMENT_FAILED;
    await billingService.downgradeToFree(sub.user_id, reason);
    await enqueueSubscriptionNotify({
      userId: sub.user_id,
      subscriptionId: sub.id,
      type: SUBSCRIPTION_NOTIFICATION_TYPES.PAYMENT_FAILED,
      title: "Payment issue — moved to Free",
      body: endReasonMessage(reason),
      forceEmail: true,
      metadata: { reason },
      immediate: true,
    });
    sent += 1;
    downgraded += 1;
  }

  return { sent, downgraded };
}

/**
 * Reconcile local Pro rows with Stripe (safety net when webhooks miss).
 */
async function runSubscriptionStatusSync() {
  if (!getStripeConfig().secretKey) {
    return { skipped: true, reason: "stripe_not_configured" };
  }

  const stripe = getStripe();
  const proRows = await Subscriptions.findAll({
    where: {
      deleted_at: null,
      status: { [Op.in]: ["active", "trialing", "past_due"] },
      stripe_subscription_id: { [Op.ne]: null },
    },
    limit: 200,
  });

  let synced = 0;
  let downgraded = 0;
  for (const row of proRows) {
    try {
      const remote = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      await billingService.syncSubscriptionFromStripe(remote);
      synced += 1;
      if (
        ["canceled", "unpaid", "past_due", "incomplete_expired"].includes(
          remote.status,
        )
      ) {
        downgraded += 1;
      }
    } catch (err) {
      // Missing remote subscription → treat as ended
      if (err?.statusCode === 404 || err?.code === "resource_missing") {
        await billingService.downgradeToFree(
          row.user_id,
          SUBSCRIPTION_END_REASONS.SUBSCRIPTION_DELETED,
        );
        await enqueueSubscriptionNotify({
          userId: row.user_id,
          subscriptionId: row.id,
          type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRED,
          title: "Subscription ended",
          body: endReasonMessage(SUBSCRIPTION_END_REASONS.SUBSCRIPTION_DELETED),
          forceEmail: true,
          immediate: true,
        });
        downgraded += 1;
      } else {
        console.error(
          `sync-status user=${row.user_id}:`,
          err?.message || err,
        );
      }
    }
  }

  // Users with Stripe customer but no active local Pro → ensure Free
  const customers = await StripeCustomers.findAll({
    where: { deleted_at: null },
    limit: 200,
  });
  for (const sc of customers) {
    const active = await Subscriptions.findOne({
      where: {
        user_id: sc.user_id,
        deleted_at: null,
        status: { [Op.in]: ["active", "trialing"] },
      },
    });
    if (!active) {
      const user = await Users.findByPk(sc.user_id);
      if (user) {
        await billingService.syncCurrentUserFromStripe(user);
      }
    }
  }

  return { synced, downgraded };
}

async function cleanupWebhookLogs() {
  const cutoff = moment().utc().subtract(90, "days").toDate();
  const deleted = await WebhookLogs.destroy({
    where: { created_at: { [Op.lt]: cutoff } },
  });
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
