import Redis from "ioredis";

// Base config (single source of truth)
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true,
};

// Main Redis instance (cache, queues, etc.)
const redis = new Redis(redisConfig);

redis.on("connect", () => console.log("✅ Redis Connected"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

// 🔥 Socket.IO adapter connections
const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();

export { redis, pubClient, subClient };
export default redis;
