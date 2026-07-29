import { Queue } from "bullmq";
import redis from "../functions/ioredisService.js";

export const mailQueue = new Queue("mailQueue", {
  connection: redis,
});
