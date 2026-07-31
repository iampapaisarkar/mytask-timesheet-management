import { subscriptionQueue } from "../queue/subscription.queue.js";
import subscriptionNotifyService from "../service/subscription/subscription-notify.service.js";

export async function enqueueSubscriptionNotify(payload, options = {}) {
  const immediate =
    options.immediate === true ||
    payload?.immediate === true ||
    process.env.DISABLE_QUEUES === "true";
  if (immediate) {
    return subscriptionNotifyService.notifySubscriptionEvent(payload);
  }
  try {
    await subscriptionQueue.add("subscription-notify", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return { queued: true };
  } catch (err) {
    console.error("enqueueSubscriptionNotify fallback:", err?.message || err);
    return subscriptionNotifyService.notifySubscriptionEvent(payload);
  }
}
