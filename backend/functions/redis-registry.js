import { createRedisClient } from "./redis-config.js";

// Main Redis instance (cache, queues, Socket.IO adapter)
const redis = createRedisClient();

// Socket.IO adapter connections
const pubClient = createRedisClient();
const subClient = pubClient.duplicate();

export { redis, pubClient, subClient };
export default redis;
