import { enqueueAuditLog } from "../queue-jobs/audit-log.job.js";
import { summarizeError } from "../utils/audit-redact.js";
import { featureFromPath } from "../utils/audit-messages.js";

const SKIP_PREFIXES = [
  "/api/mail-test",
  "/api/socket-io-test",
  "/api/firebase-notification-test",
  "/api/firebase-messaging-test",
];

/**
 * Automatically audit every inbound API request/response without blocking.
 */
export default function requestAudit(req, res, next) {
  const startedAt = Date.now();
  const startedDate = new Date();

  res.on("finish", () => {
    try {
      const path = req.originalUrl || req.url || req.path || "";
      if (!path.startsWith("/api")) return;
      if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return;
      // Avoid recursive noise on the logs API itself for list polling
      if (path.includes("/system-logs/") && req.method === "GET") {
        // Still log mutations / exports; skip high-frequency list polling
        if (/\/system-logs\/(internal|external|email|summary)/.test(path)) {
          return;
        }
      }

      const user = req.body?.user || req.user || null;
      const organisation = req.body?.organisation || null;
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 400;
      const ua = req.headers["user-agent"] || null;
      const platform =
        req.headers["x-client-platform"] ||
        req.headers["ms-platform"] ||
        null;
      const appVersion = req.headers["x-app-version"] || null;
      const channelHint = String(ua || "").toLowerCase();
      const clientChannel = /mobile|okhttp|dalvik|cfnetwork|reactnative/i.test(
        channelHint,
      )
        ? "mobile"
        : "web";

      void enqueueAuditLog("internal", {
        organisation_id: organisation?.id ?? null,
        organisation_code:
          organisation?.code ||
          req.headers["ms-organisation-code"] ||
          null,
        user_id: user?.id ?? null,
        employee_id: organisation?.employee?.id ?? null,
        role_code: organisation?.role?.code || null,
        feature: featureFromPath(path),
        controller: null,
        endpoint: String(path).split("?")[0].slice(0, 512),
        method: req.method,
        status_code: statusCode,
        success,
        technical_message: success
          ? null
          : summarizeError({
              name: "HttpError",
              message: res.statusMessage || `HTTP ${statusCode}`,
              statusCode,
            }),
        request_id: req.requestId || null,
        correlation_id: req.requestId || null,
        ip_address:
          req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
          req.ip ||
          null,
        user_agent: ua ? String(ua).slice(0, 512) : null,
        platform: platform ? String(platform).slice(0, 32) : null,
        app_version: appVersion ? String(appVersion).slice(0, 64) : null,
        client_channel: clientChannel,
        duration_ms: Date.now() - startedAt,
        started_at: startedDate,
        completed_at: new Date(),
        request_meta: {
          query: req.query || {},
          params: req.params || {},
        },
        response_meta: {
          status: statusCode,
        },
      });
    } catch (err) {
      console.error("requestAudit enqueue failed:", err?.message || err);
    }
  });

  next();
}
