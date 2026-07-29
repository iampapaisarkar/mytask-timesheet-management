import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { createApiClient } from "@mysheet/api";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { initFirebase } from "@/lib/firebase";

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

  useEffect(() => {
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
  }, []);

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
