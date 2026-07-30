/**
 * Lightweight request access log with correlation ID.
 * Avoids logging Authorization / cookies / bodies.
 */
export default function requestLogger(req, res, next) {
  const started = Date.now();
  const requestId = req.requestId || "-";

  res.on("finish", () => {
    const ms = Date.now() - started;
    // Skip noisy health probes if added later
    if (req.path === "/health" || req.path === "/favicon.ico") return;
    console.info(
      JSON.stringify({
        type: "http_access",
        requestId,
        method: req.method,
        path: req.originalUrl?.split("?")[0] || req.path,
        status: res.statusCode,
        durationMs: ms,
      }),
    );
  });

  next();
}
