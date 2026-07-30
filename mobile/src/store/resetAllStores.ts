import type { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@mytask/constants";
import { teardownRealtime, sharedOfflineQueue } from "@mytask/realtime";
import { useAuthStore } from "./authStore";
import { useOrganisationStore } from "./organisationStore";
import { useToastStore } from "./toastStore";

const KEEP_KEYS = new Set([STORAGE_KEYS.fcmToken, "mytask.theme"]);

/**
 * Atomically destroy all session-scoped client state on logout.
 * Theme preference is retained; FCM token key is cleared separately if desired.
 */
export async function resetAllStores(queryClient: QueryClient): Promise<void> {
  teardownRealtime();
  sharedOfflineQueue.clear();
  queryClient.clear();
  await useAuthStore.getState().clearSession();
  await useOrganisationStore.getState().clear();
  useToastStore.getState().clear();

  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(
      (key) =>
        (key.startsWith("mytask.") || key.startsWith("@mytask/")) &&
        !KEEP_KEYS.has(key) &&
        key !== "mytask.theme",
    );
    // Always clear auth/org keys (already cleared) and offline queue
    const offlineKey = "mytask.offlineQueue";
    if (!toRemove.includes(offlineKey) && keys.includes(offlineKey)) {
      toRemove.push(offlineKey);
    }
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // ignore storage wipe failures
  }
}
