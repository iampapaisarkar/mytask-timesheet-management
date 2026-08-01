import {
  createNavigationContainerRef,
  CommonActions,
} from "@react-navigation/native";
import type { RootStackParamList } from "./RootNavigator";

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

let pendingOrgInvitationToken: string | null = null;

export function setPendingOrgInvitationToken(token: string | null) {
  pendingOrgInvitationToken = token;
}

export function takePendingOrgInvitationToken(): string | null {
  const token = pendingOrgInvitationToken;
  pendingOrgInvitationToken = null;
  return token;
}

export function navigateToOrgInvitation(token: string) {
  if (!token) return;
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: "OrgInvitation",
        params: { token },
      }),
    );
    return;
  }
  setPendingOrgInvitationToken(token);
}

/** Call from NavigationContainer onReady to flush deferred invitation navigation. */
export function flushPendingOrgInvitation() {
  const pending = takePendingOrgInvitationToken();
  if (pending) navigateToOrgInvitation(pending);
}

export function parseOrgInvitationUrl(url: string | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!lower.includes("org-invitation")) return null;
  try {
    const normalized = url.includes("://")
      ? url
      : `https://placeholder.local${url.startsWith("/") ? "" : "/"}${url}`;
    const parsed = new URL(normalized);
    const token =
      parsed.searchParams.get("token") ||
      parsed.searchParams.get("invitation_token");
    return token?.trim() || null;
  } catch {
    const match = /[?&](?:token|invitation_token)=([^&#]+)/i.exec(url);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}
