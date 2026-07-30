/**
 * Baseline security headers (helmet-equivalent without new dependency).
 */
export default function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  res.setHeader("X-XSS-Protection", "0");
  // API-only — no CSP that would break SPA hosting if co-served
  next();
}
