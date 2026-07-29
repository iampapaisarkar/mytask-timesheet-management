import redis from "../functions/redis-registry.js";

async function setCache(key, data) {
  console.log("⏳ Cache Miss → Fetching DB ::", key);
  await redis.set(key, JSON.stringify(data), "EX", 3600);
}

async function getCache(key) {
  const cached = await redis.get(key);
  if (cached) {
    console.log("⚡ Redis Cache Hit ::", key);
    return JSON.parse(cached);
  }
  return null;
}

async function delCache(key) {
  console.log("❌ Redis Cache Delete ::", key);
  await redis.del(key);
}

async function deleteMultiKeyCache(pattern) {
  let cursor = "0";
  console.log("❌ Redis Multi Key Cache Delete ::", pattern);
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );

    cursor = nextCursor;
    console.log("cursor::", cursor);

    if (keys.length) {
      // UNLINK is async & safer
      await redis.unlink(...keys);
    }
  } while (cursor !== "0");
}

export default {
  setCache,
  getCache,
  delCache,
  deleteMultiKeyCache,
};
