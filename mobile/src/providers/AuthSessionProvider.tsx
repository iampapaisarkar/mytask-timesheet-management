import { useEffect, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { sharedAuthTokenManager } from "@mytask/auth";
import { getSocketManager } from "@mytask/realtime";
import { useAuthStore } from "../store/authStore";
import { createMobileFirebaseAuthAdapter } from "../lib/firebaseAuthAdapter";

/**
 * Keeps auth store + sockets aligned with Firebase ID token rotation.
 * TokenManager must already be configured; App waits for auth ready.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const adapter = createMobileFirebaseAuthAdapter();

    const unsubToken = sharedAuthTokenManager.onTokenUpdated((token) => {
      if (token) {
        void useAuthStore.getState().setTokenMirror(token);
      }
      void getSocketManager().updateAuthToken();
    });

    const unsubAuth = adapter.subscribeAuthState((fbUser) => {
      if (!sharedAuthTokenManager.isReady()) return;
      const { user, clearSession } = useAuthStore.getState();
      if (!fbUser) {
        if (user || useAuthStore.getState().token) void clearSession();
        return;
      }
      void sharedAuthTokenManager.getValidIdToken().then((token) => {
        if (token) void useAuthStore.getState().setTokenMirror(token);
      });
    });

    const onChange = (state: AppStateStatus) => {
      if (state === "active") {
        void sharedAuthTokenManager.getValidIdToken();
      }
    };
    const sub = AppState.addEventListener("change", onChange);

    return () => {
      unsubToken();
      unsubAuth();
      sub.remove();
    };
  }, []);

  return <>{children}</>;
}
