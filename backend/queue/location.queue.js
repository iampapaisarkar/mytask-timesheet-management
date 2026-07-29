import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const locationQueue = new Queue("locationQueue", {
  connection: redis,
});
