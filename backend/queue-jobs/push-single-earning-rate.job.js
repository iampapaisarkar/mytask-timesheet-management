import { earningRateQueue } from "../queue/earning-rate.queue.js";

export async function enqueueSingleEarningRateToXero({
  user,
  organisation,
  earningRate,
}) {
  await earningRateQueue.add(
    "push-single-earning-rate",
    {
      user,
      organisation,
      earningRate,
      isBulk: false,
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
