/** Decode JWT payload without verifying (client-side expiry hint only). */
export function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const json =
      typeof atob === "function"
        ? atob(normalized + pad)
        : Buffer.from(normalized + pad, "base64").toString("utf8");
    const data = JSON.parse(json) as { exp?: number };
    return typeof data.exp === "number" ? data.exp : null;
  } catch {
    return null;
  }
}

/** True if token is missing, malformed, or expires within `skewSeconds`. */
export function isTokenExpiringSoon(
  token: string | null | undefined,
  skewSeconds = 300,
): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (exp == null) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + skewSeconds;
}
