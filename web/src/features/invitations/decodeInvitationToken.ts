/** Invitation tokens are base64(JSON) — see backend generateInvitationToken. */
export type DecodedInvitationToken = {
  organisation_name?: string;
  invited_by?: string;
  employee_first_name?: string;
  employee_email?: string;
  [key: string]: unknown;
};

export function decodeInvitationToken(
  token: string,
): DecodedInvitationToken | null {
  if (!token) return null;
  try {
    const json = atob(token);
    return JSON.parse(json) as DecodedInvitationToken;
  } catch {
    try {
      const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(normalized);
      return JSON.parse(json) as DecodedInvitationToken;
    } catch {
      return null;
    }
  }
}
