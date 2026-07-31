import Redis from "ioredis";

/**
 * Shared Redis / BullMQ connection options for local + Google Memorystore.
 *
 * Memorystore (GCP): set REDIS_HOST to the instance private IP and attach
 * Cloud Run to the same VPC via VPC_CONNECTOR (see docs/DEPLOY_REDIS_MEMORYSTORE.md).
 */
export function isRedisLocalHost(host = process.env.REDIS_HOST) {
  return !host || host === "127.0.0.1" || host === "localhost";
}

export function isRedisDisabled() {
  if (
    process.env.REDIS_DISABLED === "true" ||
    process.env.REDIS_DISABLED === "1"
  ) {
    return true;
  }
  // Cloud Run sets K_SERVICE — localhost Redis is unreachable there
  if (process.env.K_SERVICE && isRedisLocalHost(process.env.REDIS_HOST)) {
    return true;
  }
  return false;
}

export function getRedisOptions(overrides = {}) {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  const useTls =
    process.env.REDIS_TLS === "true" || process.env.REDIS_TLS === "1";

  const options = {
    host,
    port,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: false,
    ...overrides,
  };

  if (password) {
    options.password = password;
  }

  // Memorystore usually has AUTH off; Upstash/others may need TLS.
  if (useTls) {
    options.tls = {};
  }

  return options;
}

export function createRedisClient(overrides = {}) {
  const client = new Redis(getRedisOptions(overrides));
  client.on("connect", () => console.log("✅ Redis Connected"));
  client.on("error", (err) => console.error("❌ Redis Error:", err?.message || err));
  return client;
}

export default {
  getRedisOptions,
  createRedisClient,
  isRedisDisabled,
  isRedisLocalHost,
};
