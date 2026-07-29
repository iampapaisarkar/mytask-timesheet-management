import { notificationQueue } from "../queue/notification.queue.js";

export async function enqueueSendNotification({
  user,
  sentToUserIds,
  message,
  url = null,
}) {
  await notificationQueue.add(
    "send-notification",
    {
      user,
      sentToUserIds,
      message,
      url,
    },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}
