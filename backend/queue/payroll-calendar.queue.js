import { Queue } from "bullmq";
import redis from "../functions/redis-registry.js";

export const payrollCalendarQueue = new Queue("payrollCalendarQueue", {
  connection: redis,
});
