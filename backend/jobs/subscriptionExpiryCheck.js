/**
 * Cron-style subscription jobs (also enqueueable via BullMQ subscriptionQueue).
 * Register with: npm run jobs:create / jobs:start using names matching filenames.
 *
 * - Daily expiry reminders (7/3/1 days) + period-ended → Free
 * - past_due / unpaid safety net → Free + email
 */
import { subscriptionQueue } from "../queue/subscription.queue.js";

export default async function subscriptionExpiryCheck() {
  await subscriptionQueue.add("expiry-reminders", {}, { removeOnComplete: true });
  await subscriptionQueue.add("sync-status", {}, { removeOnComplete: true });
  console.log("Enqueued subscription expiry reminders + status sync");
}
