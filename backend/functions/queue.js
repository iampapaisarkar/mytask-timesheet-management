import { Queue } from "bullmq";
import { getRedisOptions } from "./redis-config.js";
import IORedis from "ioredis";

const connection = new IORedis({
  ...getRedisOptions({ lazyConnect: false }),
  maxRetriesPerRequest: null,
});

export const venueUploadQueue = new Queue("venueBulkUpload", { connection });
