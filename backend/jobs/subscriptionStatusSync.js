/**
 * Reconcile Stripe subscription status → local Free/Pro.
 * Run periodically via BullMQ or npm jobs.
 */
import { subscriptionQueue } from "../queue/subscription.queue.js";

export default async function subscriptionStatusSync() {
  await subscriptionQueue.add("sync-status", {}, { removeOnComplete: true });
  console.log("Enqueued subscription status sync");
}
