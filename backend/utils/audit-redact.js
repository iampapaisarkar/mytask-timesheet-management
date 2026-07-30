const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|api[_-]?key|cookie|refresh|jwt|credit|card|cvv|ssn|bearer/i;

const MAX_STRING = 2000;
const MAX_DEPTH = 6;

/**
 * Deep-clone and mask confidential fields before persisting audit payloads.
 * Never throws — returns a safe summary on failure.
 */
export function redactSensitive(value, depth = 0) {
  try {
    if (value == null) return value;
    if (depth > MAX_DEPTH) return "[truncated]";
    if (typeof value === "string") {
      if (value.length > MAX_STRING) return `${value.slice(0, MAX_STRING)}…`;
      if (/^Bearer\s+/i.test(value)) return "Bearer [REDACTED]";
      return value;
    }
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((item) => redactSensitive(item, depth + 1));
    }
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactSensitive(val, depth + 1);
      }
    }
    return out;
  } catch {
    return { redacted: true };
  }
}

export function summarizeError(err) {
  if (!err) return null;
  if (typeof err === "string") return err.slice(0, MAX_STRING);
  const name = err.name || err.code || "Error";
  const message = err.message || String(err);
  const parts = [`${name}: ${message}`];
  if (err.code && err.code !== name) parts.push(`code=${err.code}`);
  if (err.status || err.statusCode) {
    parts.push(`status=${err.status || err.statusCode}`);
  }
  return parts.join(" | ").slice(0, MAX_STRING);
}

export default { redactSensitive, summarizeError };
