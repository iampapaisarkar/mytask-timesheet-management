import { subscriptionQueue } from "../queue/subscription.queue.js";

export default async function webhookCleanup() {
  await subscriptionQueue.add("webhook-cleanup", {}, { removeOnComplete: true });
  console.log("Enqueued webhook cleanup");
}
