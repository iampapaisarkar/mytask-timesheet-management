import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const subscriptionQueue = new Queue("subscriptionQueue", {
  connection: redis,
});
