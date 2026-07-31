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
/** Kept across logout so login can re-wire without remounting RealtimeProvider. */
let lastOptions: RealtimeBootstrapOptions | null = null;

/**
 * Configure singleton socket + wire domain sync into Query + Zustand stores.
 * Safe to call once at app boot; connectRealtime() when authenticated.
 * Also safe to call again after teardownRealtime() (e.g. re-login).
 */
export function bootstrapRealtime(options: RealtimeBootstrapOptions): void {
  lastOptions = options;
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
  // Logout calls teardownRealtime() which clears bootstrapped while the
  // provider stays mounted — re-apply last options so login can connect.
  if (!bootstrapped) {
    if (!lastOptions) return;
    bootstrapRealtime(lastOptions);
  }
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
  // Keep lastOptions so the next connectRealtime() can re-bootstrap.
}
