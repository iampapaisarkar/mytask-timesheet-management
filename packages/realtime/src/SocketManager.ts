import { io, type Socket } from "socket.io-client";
import {
  DOMAIN_SYNC_EVENTS,
  SOCKET_EVENTS,
  type DomainSyncEvent,
} from "./events";
import { orgRoom } from "./rooms";
import type {
  AuthLogoutPayload,
  ConnectionStatus,
  OrgJoinRequest,
  SocketEventEnvelope,
  SocketManagerOptions,
} from "./types";

type StatusListener = (status: ConnectionStatus) => void;
type EnvelopeListener = (envelope: SocketEventEnvelope) => void;

/**
 * Singleton Socket.IO client manager.
 * Connect only after authentication; disconnect on logout.
 */
export class SocketManager {
  private static instance: SocketManager | null = null;

  private socket: Socket | null = null;
  private options: SocketManagerOptions | null = null;
  private status: ConnectionStatus = "idle";
  private activeOrgId: number | null = null;
  /** Last auth token applied to the socket handshake (skip no-op reconnects). */
  private lastAuthToken: string | null = null;
  private readonly statusListeners = new Set<StatusListener>();
  private readonly envelopeListeners = new Set<EnvelopeListener>();
  private domainHandlersBound = false;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /** Test helper — resets singleton */
  static resetInstance(): void {
    SocketManager.instance?.disconnect();
    SocketManager.instance = null;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeEvents(listener: EnvelopeListener): () => void {
    this.envelopeListeners.add(listener);
    return () => {
      this.envelopeListeners.delete(listener);
    };
  }

  configure(options: SocketManagerOptions): void {
    this.options = options;
  }

  connect(): void {
    if (!this.options) {
      throw new Error("SocketManager.configure() must be called before connect()");
    }
    void this.connectAsync();
  }

  private async resolveToken(): Promise<string | null> {
    const raw = this.options?.getToken();
    const token = typeof raw === "string" || raw == null ? raw : await raw;
    return token || null;
  }

  /**
   * After Firebase ID token rotation: update handshake auth and reconnect only
   * when the token actually changed. Same-token updates must not disconnect —
   * that caused infinite connect/disconnect loops.
   */
  async updateAuthToken(): Promise<void> {
    const token = await this.resolveToken();
    if (!this.socket || !token) return;
    if (token === this.lastAuthToken) {
      this.socket.auth = this.buildAuth(token);
      return;
    }
    this.lastAuthToken = token;
    this.socket.auth = this.buildAuth(token);
    if (this.socket.connected) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  private async connectAsync(): Promise<void> {
    const token = await this.resolveToken();
    if (!token) {
      this.setStatus("idle");
      return;
    }

    if (this.socket?.connected) {
      this.syncOrganisationRoom();
      return;
    }

    if (this.socket && !this.socket.connected) {
      this.lastAuthToken = token;
      this.socket.auth = this.buildAuth(token);
      this.setStatus("reconnecting");
      this.socket.connect();
      return;
    }

    this.setStatus("connecting");
    this.lastAuthToken = token;
    this.socket = io(this.options!.url, {
      path: this.options!.path ?? "/socket.io",
      transports: this.options!.transports ?? ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.options!.reconnectionAttempts ?? Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.options!.reconnectionDelayMax ?? 15_000,
      randomizationFactor: 0.5,
      auth: this.buildAuth(token),
      withCredentials: true,
    });

    this.bindLifecycle();
    this.bindDomainEvents();
  }

  disconnect(): void {
    this.activeOrgId = null;
    this.lastAuthToken = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.domainHandlersBound = false;
    }
    this.setStatus("disconnected");
  }

  /**
   * Join (or switch) organisation room. Server validates membership —
   * never trust client-only isolation.
   */
  setOrganisation(organisationId: number | string | null): void {
    const parsed =
      organisationId == null ? null : Number(organisationId);
    const next =
      parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    const previous = this.activeOrgId;
    this.activeOrgId = next;

    if (!this.socket?.connected) return;

    if (previous && previous !== next) {
      this.socket.emit(SOCKET_EVENTS.ORG_LEAVE, {
        organisation_id: previous,
      } satisfies OrgJoinRequest);
    }

    if (next) {
      this.socket.emit(SOCKET_EVENTS.ORG_JOIN, {
        organisation_id: next,
      } satisfies OrgJoinRequest);
    }
  }

  private syncOrganisationRoom(): void {
    const orgId =
      this.activeOrgId ??
      this.options?.getOrganisationId?.() ??
      null;
    if (orgId) {
      this.setOrganisation(orgId);
    }
  }

  private buildAuth(token: string): Record<string, unknown> {
    return {
      token,
      user_id: this.options?.getUserId?.() ?? undefined,
      organisation_id:
        this.activeOrgId ??
        this.options?.getOrganisationId?.() ??
        undefined,
    };
  }

  private bindLifecycle(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.setStatus("connected");
      // Refresh auth payload from cache only — do not call getValidIdToken here.
      // That path can emit token updates and hard-reconnect in a tight loop.
      const cached = this.lastAuthToken;
      if (cached && this.socket) {
        this.socket.auth = this.buildAuth(cached);
      }
      this.syncOrganisationRoom();
    });

    this.socket.on("disconnect", () => {
      this.setStatus("disconnected");
    });

    this.socket.on("connect_error", () => {
      this.setStatus("error");
    });

    this.socket.io.on("reconnect_attempt", () => {
      void this.resolveToken().then((token) => {
        if (token && this.socket) {
          this.lastAuthToken = token;
          this.socket.auth = this.buildAuth(token);
        }
      });
      this.setStatus("reconnecting");
    });

    this.socket.io.on("reconnect", () => {
      this.setStatus("connected");
      this.syncOrganisationRoom();
    });
  }

  private bindDomainEvents(): void {
    if (!this.socket || this.domainHandlersBound) return;
    this.domainHandlersBound = true;

    for (const event of DOMAIN_SYNC_EVENTS) {
      this.socket.on(event, (payload: unknown) => {
        this.handleDomainPayload(event, payload);
      });
    }

    // Legacy alias from older backend emits
    this.socket.on("receiveNotification", (notification: unknown) => {
      this.handleDomainPayload(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        event: SOCKET_EVENTS.NOTIFICATION_CREATED,
        organisation_id: null,
        emitted_at: new Date().toISOString(),
        data: notification,
      });
    });
  }

  private handleDomainPayload(event: DomainSyncEvent, payload: unknown): void {
    const envelope = normalizeEnvelope(event, payload);

    if (event === SOCKET_EVENTS.AUTH_LOGOUT) {
      const data = envelope.data as AuthLogoutPayload;
      this.options?.onForcedLogout?.(data);
    }

    this.options?.onEvent?.(envelope);
    for (const listener of this.envelopeListeners) {
      listener(envelope);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}

function normalizeEnvelope(
  event: DomainSyncEvent,
  payload: unknown,
): SocketEventEnvelope {
  if (
    payload &&
    typeof payload === "object" &&
    "event" in payload &&
    "emitted_at" in payload &&
    "data" in payload
  ) {
    return payload as SocketEventEnvelope;
  }

  const data = (payload ?? {}) as Record<string, unknown>;
  const organisationId =
    typeof data.organisation_id === "number" ? data.organisation_id : null;

  return {
    event,
    organisation_id: organisationId,
    entity_id:
      typeof data.id === "number" || typeof data.id === "string"
        ? data.id
        : null,
    emitted_at: new Date().toISOString(),
    data: payload,
  };
}

export function getSocketManager(): SocketManager {
  return SocketManager.getInstance();
}

export { orgRoom };
