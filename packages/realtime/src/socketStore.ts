import { create } from "zustand";
import type { ConnectionStatus } from "./types";
import { getSocketManager } from "./SocketManager";
import { sharedOfflineQueue } from "./offlineQueue";
import { resetDomainStores } from "./domainStores";
import { useTrackingLiveStore } from "./trackingLiveStore";

interface SocketStoreState {
  status: ConnectionStatus;
  socketId: string | null;
  lastError: string | null;
  setStatus: (status: ConnectionStatus, socketId?: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketStoreState>((set) => ({
  status: "idle",
  socketId: null,
  lastError: null,
  setStatus: (status, socketId = null) =>
    set({ status, socketId, lastError: status === "error" ? "Connection error" : null }),
  setError: (lastError) => set({ lastError }),
  reset: () =>
    set({ status: "idle", socketId: null, lastError: null }),
}));

/**
 * Tear down realtime + domain state. Call from app logout after clearing auth.
 * Does not clear theme/sidebar preferences.
 */
export function resetRealtimeClientState(): void {
  getSocketManager().disconnect();
  useSocketStore.getState().reset();
  resetDomainStores();
  useTrackingLiveStore.getState().reset();
  sharedOfflineQueue.clear();
}
