import type { QueryClient } from "@tanstack/react-query";
import {
  applyRealtimeToClientState,
  getSocketManager,
  resetRealtimeClientState,
  useSocketStore,
  type AuthLogoutPayload,
  type ConnectionStatus,
} from "@mytask/realtime";

export type RealtimeBootstrapOptions = {
  url: string;
  getToken: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  getUserId: () => number | string | null | undefined;
  getOrganisationId: () => number | string | null | undefined;
  queryClient: QueryClient;
  onForcedLogout?: (payload: AuthLogoutPayload) => void;
};

let unsubscribeStatus: (() => void) | null = null;
let unsubscribeEvents: (() => void) | null = null;
let bootstrapped = false;

/**
 * Configure singleton socket + wire domain sync into Query + Zustand stores.
 * Safe to call once at app boot; connectRealtime() when authenticated.
 */
export function bootstrapRealtime(options: RealtimeBootstrapOptions): void {
  const manager = getSocketManager();
  manager.configure({
    url: options.url,
    getToken: options.getToken,
    getUserId: options.getUserId,
    getOrganisationId: options.getOrganisationId,
    onForcedLogout: options.onForcedLogout,
  });

  unsubscribeStatus?.();
  unsubscribeEvents?.();

  unsubscribeStatus = manager.subscribeStatus((status: ConnectionStatus) => {
    useSocketStore.getState().setStatus(status, manager.getSocketId());
  });

  unsubscribeEvents = manager.subscribeEvents((envelope) => {
    applyRealtimeToClientState(options.queryClient, envelope);
  });

  bootstrapped = true;
}

export function connectRealtime(): void {
  if (!bootstrapped) return;
  getSocketManager().connect();
}

export function disconnectRealtime(): void {
  getSocketManager().disconnect();
}

export function setRealtimeOrganisation(
  organisationId: number | string | null,
): void {
  getSocketManager().setOrganisation(organisationId);
}

export function teardownRealtime(): void {
  unsubscribeStatus?.();
  unsubscribeEvents?.();
  unsubscribeStatus = null;
  unsubscribeEvents = null;
  resetRealtimeClientState();
  bootstrapped = false;
}
