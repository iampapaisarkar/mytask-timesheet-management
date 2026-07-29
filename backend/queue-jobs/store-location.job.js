import { locationQueue } from "../queue/location.queue.js";

export async function enqueueStoreLocation({
  location,
  type,
  organisationCode,
  userId,
  fcmToken,
}) {
  await locationQueue.add(
    "store-location",
    {
      location,
      type,
      organisationCode,
      userId,
      fcmToken,
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
