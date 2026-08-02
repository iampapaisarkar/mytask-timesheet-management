import { locationQueue } from "../queue/location.queue.js";

export async function enqueueStoreLocation({
  location,
  type,
  organisationCode,
  userId,
  remarks,
  authenticatedUserId,
}) {
  await locationQueue.add(
    "store-location",
    {
      location,
      type,
      organisationCode,
      userId,
      remarks,
      authenticatedUserId,
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
