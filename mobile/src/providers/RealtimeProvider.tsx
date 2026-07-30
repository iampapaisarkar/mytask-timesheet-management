import { useEffect, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  bootstrapRealtime,
  connectRealtime,
  disconnectRealtime,
  setRealtimeOrganisation,
  sharedOfflineQueue,
  type OfflineMutation,
} from "@mytask/realtime";
import { useAuthStore } from "../store/authStore";
import { useOrganisationStore } from "../store/organisationStore";
import { resetAllStores } from "../store/resetAllStores";
import { ENV } from "../config/env";

const OFFLINE_QUEUE_KEY = "mytask.offlineQueue";

function socketBaseUrl(): string {
  return ENV.API_BASE_URL.replace(/\/api\/?$/, "") || "http://localhost:8080";
}

async function persistOfflineQueue(items: OfflineMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const organisationId = useOrganisationStore(
    (s) => s.organisation?.id ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let hydrate: OfflineMutation[] = [];
      try {
        const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        if (raw) hydrate = JSON.parse(raw) as OfflineMutation[];
      } catch {
        hydrate = [];
      }
      if (cancelled) return;

      sharedOfflineQueue.configure({
        hydrate,
        persist: (items) => {
          void persistOfflineQueue(items);
        },
        executor: async () => {
          // Domain mutations enqueue here; executor is wired per-feature when offline writes are added.
          // Placeholder no-op keeps flush safe until specific writers register.
        },
      });

      bootstrapRealtime({
        url: socketBaseUrl(),
        getToken: () => useAuthStore.getState().token,
        getUserId: () => useAuthStore.getState().user?.id ?? null,
        getOrganisationId: () =>
          useOrganisationStore.getState().organisation?.id ?? null,
        queryClient,
        onForcedLogout: () => {
          void resetAllStores(queryClient);
        },
      });
    })();

    return () => {
      cancelled = true;
      // Singleton survives remounts; logout uses teardownRealtime().
    };
  }, [queryClient]);

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
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && useAuthStore.getState().token) {
        connectRealtime();
        void sharedOfflineQueue.flush();
      } else if (state === "background") {
        // Keep connection for push sync; reconnect on resume if dropped
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
