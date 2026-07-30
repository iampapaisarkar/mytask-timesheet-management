import redis from "../functions/redis-registry.js";

/**
 * Redis sliding-window rate limiter.
 * Defaults: 120 req / 60s per IP. Auth routes can use a stricter key.
 *
 * Env:
 *   RATE_LIMIT_WINDOW_MS (default 60000)
 *   RATE_LIMIT_MAX (default 120)
 *   RATE_LIMIT_DISABLED=true to skip
 */
export function createRateLimiter(options = {}) {
  const windowMs = Number(
    options.windowMs ?? process.env.RATE_LIMIT_WINDOW_MS ?? 60_000,
  );
  const max = Number(options.max ?? process.env.RATE_LIMIT_MAX ?? 120);
  const prefix = options.prefix || "rl";

  return async function rateLimiter(req, res, next) {
    if (
      process.env.RATE_LIMIT_DISABLED === "true" ||
      process.env.NODE_ENV === "test"
    ) {
      return next();
    }

    try {
      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown";
      const bucket = Math.floor(Date.now() / windowMs);
      const key = `${prefix}:${ip}:${bucket}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)));
      if (count > max) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again shortly.",
          errors: [{ code: "RATE_LIMITED", message: "Rate limit exceeded" }],
          data: null,
          meta: {},
          requestId: req.requestId || null,
        });
      }
      return next();
    } catch (err) {
      // Fail open — never block traffic if Redis is down
      console.error("rateLimiter:", err?.message || err);
      return next();
    }
  };
}

export default createRateLimiter();
