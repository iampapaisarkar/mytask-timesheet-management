import models from "../../models/index.js";
import { emitAuditLogCreated } from "../realtime.service.js";

const { AuditInternalApiLogs, AuditExternalApiLogs, AuditEmailLogs } = models;

export async function writeAuditBatch(items = []) {
  for (const item of items) {
    await writeAuditRecord(item.type, item.payload);
  }
}

export async function writeAuditRecord(type, payload) {
  if (!payload) return null;
  let row = null;
  if (type === "internal") {
    row = await AuditInternalApiLogs.create(payload);
  } else if (type === "external") {
    row = await AuditExternalApiLogs.create(payload);
  } else if (type === "email") {
    row = await AuditEmailLogs.create(payload);
  } else {
    return null;
  }

  try {
    emitAuditLogCreated(row, type);
  } catch (err) {
    console.error("audit realtime emit failed:", err?.message || err);
  }
  return row;
}

export default { writeAuditBatch, writeAuditRecord };
