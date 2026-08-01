/** Invitation tokens are base64(JSON) — see backend generateInvitationToken. */
export type DecodedInvitationToken = {
  organisation_name?: string;
  invited_by?: string;
  employee_first_name?: string;
  employee_email?: string;
  [key: string]: unknown;
};

function decodeBase64(value: string): string {
  const atobFn = (globalThis as { atob?: (data: string) => string }).atob;
  if (typeof atobFn === "function") {
    return atobFn(value);
  }
  throw new Error("base64 decode unavailable");
}

/**
 * Decode org invitation token for preview UI.
 * Uses base64 → JSON; supports URL-safe base64 variants.
 */
export function decodeInvitationToken(
  token: string,
): DecodedInvitationToken | null {
  if (!token) return null;
  try {
    return JSON.parse(decodeBase64(token)) as DecodedInvitationToken;
  } catch {
    try {
      const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
      const pad = normalized.length % 4;
      const padded =
        pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
      return JSON.parse(decodeBase64(padded)) as DecodedInvitationToken;
    } catch {
      return null;
    }
  }
}
