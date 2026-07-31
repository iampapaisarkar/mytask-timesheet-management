/**
 * Cron-style subscription jobs (also enqueueable via BullMQ subscriptionQueue).
 * Register with: npm run jobs:create / jobs:start using names matching filenames.
 */
import { subscriptionQueue } from "../queue/subscription.queue.js";

export default async function subscriptionExpiryCheck() {
  await subscriptionQueue.add("expiry-reminders", {}, { removeOnComplete: true });
  console.log("Enqueued subscription expiry reminders");
}
