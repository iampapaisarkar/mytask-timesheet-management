import { createRedisClient } from "./redis-config.js";

const redis = createRedisClient();

export default redis;
