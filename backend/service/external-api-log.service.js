import moment from "moment";
import { randomUUID } from "crypto";
import models from "../models/index.js";
import { enqueueAuditLog } from "../queue-jobs/audit-log.job.js";
import { summarizeError } from "../utils/audit-redact.js";

const { ExternalApiCallLogs } = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/**
 * Log outbound integrations (Firebase, FCM, Maps, payment, etc.).
 * Prefer this helper from wrappers — never block the calling API.
 */
async function storeExternalApiCallLog(
  user,
  organisation,
  platform,
  url,
  method,
  body,
  contentType,
  response,
  options = {},
) {
  const currentUTCTime = moment().utc().format();
  const success =
    options.success ??
    (response?.success !== false &&
      !(response?.error || response?.statusCode >= 400));

  try {
    await ExternalApiCallLogs.create({
      orgnisaion_id: organisation?.id || null,
      user_id: user?.id || null,
      platform: platform || "unknown",
      url: url || "unknown",
      method: method || "unknown",
      body: body || null,
      content_type: contentType || null,
      response: response || null,
      executed_at: currentUTCTime,
    });
  } catch (err) {
    console.error("legacy external_api_call_logs write failed:", err?.message || err);
  }

  try {
    const requestId = options.requestId || randomUUID();
    const correlationId = options.correlationId || requestId;
    await enqueueAuditLog("external", {
      organisation_id: organisation?.id ?? null,
      organisation_code: organisation?.code ?? null,
      user_id: user?.id ?? null,
      employee_id: organisation?.employee?.id ?? null,
      feature: options.feature || platform || "External API",
      api_name: options.apiName || platform || "external",
      endpoint: url || null,
      method: method || "POST",
      status_code: options.statusCode ?? response?.statusCode ?? response?.status ?? null,
      success: Boolean(success),
      duration_ms: options.durationMs ?? null,
      technical_message:
        options.technicalMessage ||
        summarizeError(options.error) ||
        (success ? null : summarizeError(response)),
      request_id: requestId,
      correlation_id: correlationId,
      request_meta: {
        content_type: contentType || null,
        body,
      },
      response_meta: response || null,
      executed_at: new Date(),
    });
  } catch (err) {
    console.error("enterprise external audit enqueue failed:", err?.message || err);
  }

  return true;
}

export default {
  storeExternalApiCallLog,
};
