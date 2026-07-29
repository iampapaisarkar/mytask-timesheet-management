import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const notificationQueue = new Queue("notificationQueue", {
  connection: redis,
});
