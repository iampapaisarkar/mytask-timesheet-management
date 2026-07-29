import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { createApiClient } from "@mysheet/api";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { initFirebase, isFirebaseConfigured } from "@/lib/firebase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!isFirebaseConfigured()) {
        setBootError(
          "Firebase is not configured. Copy web/.env.example to web/.env, fill VITE_FIREBASE_* values, then restart npm run web.",
        );
        return;
      }
      initFirebase();
      createApiClient({
        baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
        getToken: () => useAuthStore.getState().token,
        getOrganisation: () => useOrganisationStore.getState().organisation,
        onUnauthorized: () => {
          useAuthStore.getState().clearSession();
          useOrganisationStore.getState().clear();
        },
      });
      useAuthStore.getState().hydrate();
      useOrganisationStore.getState().hydrate();
      setReady(true);
    } catch (err) {
      setBootError(
        err instanceof Error ? err.message : "Failed to initialise the app.",
      );
    }
  }, []);

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <div className="max-w-lg rounded-lg border border-negative/30 bg-white p-6 text-sm">
          <h1 className="text-lg font-semibold text-negative">Setup required</h1>
          <p className="mt-2 text-dark">{bootError}</p>
          <p className="mt-3 text-muted">
            Vite only loads <code className="text-dark">.env</code> at startup —
            restart the web server after editing it.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
