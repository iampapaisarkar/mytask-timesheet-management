import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const mailQueue = new Queue("mailQueue", {
  connection: redis,
});
