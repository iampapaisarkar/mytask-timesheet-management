import redis from "../functions/redis-registry.js";

async function setCache(key, data) {
  await redis.set(key, JSON.stringify(data), "EX", 3600);
}

async function setCacheEx(key, data, ttlSeconds) {
  const ttl = Math.max(1, Number(ttlSeconds) || 60);
  await redis.set(key, JSON.stringify(data), "EX", ttl);
}

async function getCache(key) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async function delCache(key) {
  await redis.del(key);
}

async function deleteMultiKeyCache(pattern) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );

    cursor = nextCursor;

    if (keys.length) {
      await redis.unlink(...keys);
    }
  } while (cursor !== "0");
}

export default {
  setCache,
  setCacheEx,
  getCache,
  delCache,
  deleteMultiKeyCache,
};
