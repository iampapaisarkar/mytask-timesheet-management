import moment from "moment";
import { auditQueue } from "../queue/audit.queue.js";
import { redactSensitive } from "../utils/audit-redact.js";
import {
  errorCategoryFromStatus,
  featureFromPath,
  friendlyEmailMessage,
  friendlyExternalMessage,
  friendlyInternalMessage,
} from "../utils/audit-messages.js";

const FALLBACK_BUFFER = [];
const FALLBACK_FLUSH_MS = 2000;
let fallbackTimer = null;

/**
 * Non-blocking audit enqueue. Falls back to in-process buffer if Redis is down.
 * Emits realtime from this process (API has Socket.IO; workers may not).
 */
export async function enqueueAuditLog(type, payload) {
  const job = sanitizePayload(type, payload);
  try {
    await auditQueue.add(
      "write-audit",
      { type, payload: job },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    notifyRealtime(type, job);
    return { queued: true };
  } catch (err) {
    bufferFallback(type, job);
    return { queued: false, buffered: true, error: err?.message };
  }
}

function notifyRealtime(type, job) {
  try {
    // Dynamic import avoids circular deps at module load
    import("../service/realtime.service.js")
      .then(({ emitAuditLogCreated }) => {
        emitAuditLogCreated(
          {
            ...job,
            id: job.id || `pending-${Date.now()}`,
          },
          type,
        );
      })
      .catch(() => {});
  } catch {
    /* non-fatal */
  }
}

function sanitizePayload(type, payload = {}) {
  const now = moment().utc().toDate();
  const base = {
    ...payload,
    request_meta: redactSensitive(payload.request_meta),
    response_meta: redactSensitive(payload.response_meta),
    provider_response: redactSensitive(payload.provider_response),
    created_at: payload.created_at || now,
  };

  if (type === "internal") {
    const success = Boolean(
      payload.success ??
        (payload.status_code >= 200 && payload.status_code < 400),
    );
    const feature = payload.feature || featureFromPath(payload.endpoint);
    return {
      ...base,
      feature,
      success,
      error_category:
        payload.error_category ||
        (success ? null : errorCategoryFromStatus(payload.status_code)),
      friendly_message:
        payload.friendly_message ||
        friendlyInternalMessage({
          success,
          statusCode: payload.status_code,
          feature,
          path: payload.endpoint,
        }),
      started_at: payload.started_at || now,
      completed_at: payload.completed_at || now,
    };
  }

  if (type === "external") {
    const success = Boolean(payload.success);
    return {
      ...base,
      success,
      friendly_message:
        payload.friendly_message ||
        friendlyExternalMessage({
          success,
          apiName: payload.api_name,
          statusCode: payload.status_code,
        }),
      executed_at: payload.executed_at || now,
    };
  }

  if (type === "email") {
    const success = Boolean(payload.success);
    return {
      ...base,
      success,
      status: payload.status || (success ? "delivered" : "failed"),
      friendly_message:
        payload.friendly_message ||
        friendlyEmailMessage({ success, template: payload.template }),
      sent_at: payload.sent_at || now,
      retry_count: payload.retry_count || 0,
    };
  }

  return base;
}

function bufferFallback(type, payload) {
  FALLBACK_BUFFER.push({ type, payload });
  if (FALLBACK_BUFFER.length > 500) FALLBACK_BUFFER.shift();
  if (!fallbackTimer) {
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null;
      void flushFallbackBuffer();
    }, FALLBACK_FLUSH_MS);
  }
}

async function flushFallbackBuffer() {
  if (!FALLBACK_BUFFER.length) return;
  const batch = FALLBACK_BUFFER.splice(0, FALLBACK_BUFFER.length);
  try {
    const { writeAuditBatch } = await import("../service/audit/audit.persist.js");
    await writeAuditBatch(batch);
  } catch (err) {
    console.error("audit fallback flush failed:", err?.message || err);
  }
}

export default { enqueueAuditLog };
