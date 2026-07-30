import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const reportQueue = new Queue("reportQueue", {
  connection: redis,
});
