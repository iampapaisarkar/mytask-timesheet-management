import { useEffect, type ReactNode } from "react";
import { sharedAuthTokenManager } from "@mytask/auth";
import { getSocketManager } from "@mytask/realtime";
import { useAuthStore } from "@/store/authStore";
import { createWebFirebaseAuthAdapter } from "@/lib/firebaseAuthAdapter";

/**
 * Keeps auth store + sockets aligned with Firebase ID token rotation.
 * TokenManager must already be configured; AppProviders waits for auth ready.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const adapter = createWebFirebaseAuthAdapter();

    const unsubToken = sharedAuthTokenManager.onTokenUpdated((token) => {
      // Mirror only — never clear session here (null can fire during rotation).
      if (!token) return;
      useAuthStore.getState().setTokenMirror(token);
      void getSocketManager().updateAuthToken();
    });

    const unsubAuth = adapter.subscribeAuthState((fbUser) => {
      if (!sharedAuthTokenManager.isReady()) return;
      const { user, clearSession } = useAuthStore.getState();
      if (!fbUser) {
        if (user || useAuthStore.getState().token) clearSession();
        return;
      }
      void sharedAuthTokenManager.getValidIdToken().then((token) => {
        if (token) useAuthStore.getState().setTokenMirror(token);
      });
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void sharedAuthTokenManager.getValidIdToken();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsubToken();
      unsubAuth();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <>{children}</>;
}
