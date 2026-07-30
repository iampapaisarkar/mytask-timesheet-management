import systemLogsService from "../service/audit/system-logs.service.js";

/**
 * Retention cleanup for enterprise audit tables.
 * AUDIT_LOG_RETENTION_DAYS default 90 (min 30, max 365).
 */
export async function runAuditRetentionCleanup() {
  const raw = Number(process.env.AUDIT_LOG_RETENTION_DAYS || 90);
  const days = Math.min(365, Math.max(30, Number.isFinite(raw) ? raw : 90));
  const result = await systemLogsService.purgeOlderThan(days);
  console.info(
    JSON.stringify({
      type: "audit_retention",
      days,
      ...result,
    }),
  );
  return result;
}

export default { runAuditRetentionCleanup };
