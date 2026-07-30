/**
 * Additive enterprise response envelope.
 *
 * Preserves legacy `{ data, info }` shape used by web/mobile clients, while
 * adding:
 *   success, message, meta, errors, requestId
 *
 * Never strips existing fields.
 */
export default function responseStandard(req, res, next) {
  const originalJson = res.json.bind(res);
  const startedAt = Date.now();

  res.json = function enterpriseJson(body = {}) {
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? { ...body }
        : { data: body };

    const ok = res.statusCode >= 200 && res.statusCode < 300;
    const message =
      payload.message ??
      payload.info?.message ??
      (ok ? "Success" : "Request failed");

    if (payload.success === undefined) {
      payload.success = ok;
    }
    if (payload.message === undefined && message != null) {
      // Leave message for the legacy info injector in index.js to lift
      payload.message = message;
    }
    if (payload.errors === undefined) {
      payload.errors = ok ? null : payload.details ? [{ message: String(payload.details) }] : null;
    }
    if (payload.meta === undefined) {
      payload.meta = payload.pagination
        ? { pagination: payload.pagination }
        : {};
    }
    if (payload.requestId === undefined) {
      payload.requestId = req.requestId || null;
    }
    if (payload.meta && typeof payload.meta === "object") {
      payload.meta.durationMs = Date.now() - startedAt;
    }

    return originalJson(payload);
  };

  next();
}
