import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import {
  bootstrapRealtime,
  connectRealtime,
  disconnectRealtime,
  setRealtimeOrganisation,
  sharedOfflineQueue,
} from "@mytask/realtime";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { resetAllStores } from "@/store/resetAllStores";

function socketBaseUrl(): string {
  const api =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
  return api.replace(/\/api\/?$/, "") || "http://localhost:8080";
}

/**
 * Owns the singleton Socket.IO lifecycle for the web app.
 * Connects after auth hydrate; joins org room on org switch; tears down on logout.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const organisationId = useOrganisationStore((s) => s.organisation?.id ?? null);

  useEffect(() => {
    bootstrapRealtime({
      url: socketBaseUrl(),
      getToken: () => useAuthStore.getState().token,
      getUserId: () => useAuthStore.getState().user?.id ?? null,
      getOrganisationId: () =>
        useOrganisationStore.getState().organisation?.id ?? null,
      queryClient,
      onForcedLogout: () => {
        void resetAllStores(queryClient).then(() => {
          navigate(ROUTES.login, { replace: true });
        });
      },
    });

    return () => {
      // Keep singleton alive across Strict Mode remounts; logout calls teardownRealtime().
    };
  }, [queryClient, navigate]);

  useEffect(() => {
    if (token && userId) {
      connectRealtime();
      setRealtimeOrganisation(organisationId);
      void sharedOfflineQueue.flush();
    } else {
      disconnectRealtime();
    }
  }, [token, userId, organisationId]);

  useEffect(() => {
    const onOnline = () => {
      if (useAuthStore.getState().token) {
        connectRealtime();
        void sharedOfflineQueue.flush();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return <>{children}</>;
}
