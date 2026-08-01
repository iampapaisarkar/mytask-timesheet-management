import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import {
  navigateToOrgInvitation,
  takePendingOrgInvitationToken,
} from "./navigationRef";

/**
 * Flushes a pending org-invitation token after login/signup remounts the
 * authenticated stack. Cold-start / runtime HTTPS + mytask:// URLs are handled
 * by React Navigation `linking` (see `linking.ts`).
 */
export function DeepLinkHandler() {
  const authToken = useAuthStore((s) => s.token);
  const prevAuthToken = useRef(authToken);

  useEffect(() => {
    const wasLoggedOut = !prevAuthToken.current;
    prevAuthToken.current = authToken;
    if (!authToken || !wasLoggedOut) return;
    const pending = takePendingOrgInvitationToken();
    if (pending) {
      const id = setTimeout(() => navigateToOrgInvitation(pending), 0);
      return () => clearTimeout(id);
    }
  }, [authToken]);

  return null;
}
