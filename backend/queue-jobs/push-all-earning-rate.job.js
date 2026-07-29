import { earningRateQueue } from "../queue/earning-rate.queue.js";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { EarningRates } = models;
import { v4 as uuid } from "uuid";

export async function enqueueAllEarningRateToXero({ user, organisation }) {
  const batchId = uuid();
  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const systemEarningRates = await EarningRates.findAll({
      where: { organisation_id: organisation.id },
      limit,
      offset,
    });

    if (!systemEarningRates.length) break;

    for (const er of systemEarningRates) {
      await earningRateQueue.add(
        "push-single-earning-rate",
        {
          user,
          organisation,
          earningRate: er,
          isBulk: true,
          batchId,
        },
        {
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: true,
        }
      );
      total++;
    }

    offset += limit;
  }

  await redis.hset(`xero:earningrate:batch:${batchId}`, {
    total,
    success: 0,
    failed: 0,
    userId: user.id,
    orgId: organisation.id,
  });

  return batchId;
}
