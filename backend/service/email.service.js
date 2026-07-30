import moment from "moment";
import { randomUUID } from "crypto";
import models from "../models/index.js";
import { enqueueAuditLog } from "../queue-jobs/audit-log.job.js";
import { summarizeError } from "../utils/audit-redact.js";

const { EmailSendLogs } = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/**
 * Persist email audit (enterprise + legacy table).
 * Never throws to callers of NodeMailer — logging must not break mail.
 */
async function storeEmailSendLog(
  user,
  organisation,
  emails,
  message,
  options = {},
) {
  const currentUTCTime = moment().utc().format();
  const list = Array.isArray(emails) ? emails : emails ? [emails] : [];
  const success = options.success !== false;
  const started = options.startedAt || Date.now();

  try {
    await EmailSendLogs.create({
      subject: message?.subject,
      template: message?.template,
      body: message?.variables?.message,
      email_to: list.length ? JSON.stringify(list) : null,
      sent_by: user ? user?.email : null,
      sent_at: currentUTCTime,
    });
  } catch (err) {
    console.error("legacy email_send_logs write failed:", err?.message || err);
  }

  try {
    const requestId = options.requestId || randomUUID();
    const correlationId = options.correlationId || requestId;
    await enqueueAuditLog("email", {
      organisation_id: organisation?.id ?? null,
      organisation_code: organisation?.code ?? null,
      user_id: user?.id ?? null,
      feature: options.feature || "Email",
      recipient: list.join(", ").slice(0, 512),
      subject: message?.subject || null,
      template: message?.template || null,
      provider: options.provider || "smtp",
      provider_message_id: options.messageId || null,
      status: success ? "delivered" : "failed",
      success,
      retry_count: options.retryCount || 0,
      duration_ms: options.durationMs ?? Date.now() - started,
      technical_message: success
        ? null
        : summarizeError(options.error) || options.technicalMessage || null,
      provider_response: options.providerResponse || null,
      correlation_id: correlationId,
      request_id: requestId,
      sent_at: new Date(),
    });
  } catch (err) {
    console.error("enterprise email audit enqueue failed:", err?.message || err);
  }

  return true;
}

export default {
  storeEmailSendLog,
};
