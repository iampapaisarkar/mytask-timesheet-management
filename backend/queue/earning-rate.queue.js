import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const earningRateQueue = new Queue("earningRateQueue", {
  connection: redis,
});
