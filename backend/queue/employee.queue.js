import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const employeeQueue = new Queue("employeeQueue", {
  connection: redis,
});
