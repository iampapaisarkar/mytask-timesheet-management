import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@mytask/api";
import { sharedAuthTokenManager } from "@mytask/auth";
import { createAppQueryClient } from "@mytask/hooks";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { useThemeStore } from "@/store/themeStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { resetAllStores } from "@/store/resetAllStores";
import {
  initFirebase,
  isFirebaseConfigured,
  signOutUser,
} from "@/services/firebase";
import { createWebFirebaseAuthAdapter } from "@/lib/firebaseAuthAdapter";
import { AuthSessionProvider } from "@/providers/AuthSessionProvider";
import { ToastViewport } from "@/components/ui/ToastViewport";

export const queryClient = createAppQueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        useThemeStore.getState().hydrate();
        useSidebarStore.getState().hydrate();
        if (!isFirebaseConfigured()) {
          setBootError(
            "Firebase is not configured. Copy web/.env.example to web/.env, fill VITE_FIREBASE_* values, then restart npm run web.",
          );
          return;
        }
        initFirebase();
        const adapter = createWebFirebaseAuthAdapter();
        sharedAuthTokenManager.configure(adapter);
        createApiClient({
          baseURL:
            import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
          getToken: sharedAuthTokenManager.createGetToken(),
          refreshToken: sharedAuthTokenManager.createRefreshToken(),
          getOrganisation: () => useOrganisationStore.getState().organisation,
          onUnauthorized: () => {
            void signOutUser().catch(() => undefined);
            void resetAllStores(queryClient);
          },
        });

        useAuthStore.getState().hydrate();
        useOrganisationStore.getState().hydrate();

        // Wait for Firebase persistence before any authenticated UI/API.
        await sharedAuthTokenManager.waitUntilReady();
        if (cancelled) return;

        const fbUser = adapter.getCurrentUser();
        if (!fbUser) {
          // Storage alone is not a session — avoid fake logged-in state.
          if (useAuthStore.getState().user || useAuthStore.getState().token) {
            useAuthStore.getState().clearSession();
          }
        } else {
          const token = await sharedAuthTokenManager.getValidIdToken();
          if (token) useAuthStore.getState().setTokenMirror(token);
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : "Failed to initialise the app.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <div className="mt-card max-w-lg p-6 text-sm">
          <h1 className="text-lg font-semibold text-negative">Setup required</h1>
          <p className="mt-2 text-[var(--mt-text)]">{bootError}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-6">
        <img src="/logo.png" alt="myTask" className="h-14 w-14 rounded-2xl" />
        <div className="mt-skeleton h-3 w-40" />
        <p className="text-sm text-muted">Starting myTask…</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        {children}
        <ToastViewport />
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
