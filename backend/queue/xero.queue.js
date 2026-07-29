import { Queue } from "bullmq";
import redis from "../functions/ioredisService.js";

export const xeroQueue = new Queue("xeroQueue", {
  connection: redis,
});
