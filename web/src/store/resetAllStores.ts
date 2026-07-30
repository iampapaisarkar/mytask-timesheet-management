import type { QueryClient } from "@tanstack/react-query";
import { teardownRealtime } from "@mytask/realtime";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";

/**
 * Atomically destroy all session-scoped client state on logout.
 * Theme + sidebar preferences are intentionally retained.
 */
export async function resetAllStores(queryClient: QueryClient): Promise<void> {
  teardownRealtime();
  queryClient.clear();
  useAuthStore.getState().clearSession();
  useOrganisationStore.getState().clear();
  useToastStore.getState().clear();

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  // Clear any leftover mytask.* keys except theme/sidebar
  const keep = new Set(["mytask.theme", "mytask.sidebarCollapsed"]);
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (key.startsWith("mytask.") && !keep.has(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  if (typeof indexedDB !== "undefined" && indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(
        (dbs || [])
          .filter((db) => db.name?.startsWith("mytask"))
          .map(
            (db) =>
              new Promise<void>((resolve) => {
                if (!db.name) {
                  resolve();
                  return;
                }
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
      );
    } catch {
      // ignore
    }
  }
}
