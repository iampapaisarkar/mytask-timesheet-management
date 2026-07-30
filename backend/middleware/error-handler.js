/**
 * Central Express error handler — must be registered AFTER routes.
 */
export default function errorHandler(err, req, res, _next) {
  const status = Number(err.statusCode || err.status || 500);
  const requestId = req.requestId || null;
  console.error(
    JSON.stringify({
      type: "http_error",
      requestId,
      status,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    }),
  );

  if (res.headersSent) return;

  return res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "An unexpected error occurred"
        : err.message || "Request failed",
    data: null,
    meta: {},
    errors: [
      {
        code: err.code || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
        message: err.message || "Request failed",
      },
    ],
    requestId,
  });
}
