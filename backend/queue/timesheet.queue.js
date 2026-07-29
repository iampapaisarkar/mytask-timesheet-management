import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const timesheetQueue = new Queue("timesheetQueue", {
  connection: redis,
});
