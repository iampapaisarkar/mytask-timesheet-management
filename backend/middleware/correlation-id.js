import { randomUUID } from "crypto";

/**
 * Attach a correlation / request ID to every request for audit trails.
 * Honours inbound `x-request-id` / `x-correlation-id` when present.
 */
export default function correlationId(req, res, next) {
  const incoming =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    null;
  const id =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
