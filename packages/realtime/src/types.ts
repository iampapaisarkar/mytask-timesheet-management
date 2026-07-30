import type { SocketEventName } from "./events";

/** Envelope wrapped around every domain emit from the gateway */
export interface SocketEventEnvelope<T = unknown> {
  event: SocketEventName;
  organisation_id: number | null;
  entity_id?: number | string | null;
  actor_user_id?: number | null;
  emitted_at: string;
  data: T;
}

export interface EntityPayload {
  id: number | string;
  organisation_id?: number;
  [key: string]: unknown;
}

export interface EmployeeEventPayload extends EntityPayload {
  user_id?: number | null;
  status?: string | null;
}

export interface TimesheetEventPayload extends EntityPayload {
  employee_id?: number;
  status_code?: string | null;
  code?: string | null;
}

export interface PayoutEventPayload extends EntityPayload {
  timesheet_id?: number;
  employee_id?: number;
  status?: string | null;
}

export interface ReportEventPayload extends EntityPayload {
  status?: string | null;
  name?: string | null;
  requested_by?: number | null;
}

export interface PayrollEventPayload extends EntityPayload {
  employee_id?: number;
}

export interface NotificationEventPayload extends EntityPayload {
  user_id?: number;
  title?: string;
  body?: string;
  url?: string | null;
  status?: { id?: number; code?: string; name?: string } | null;
}

export interface AuthLogoutPayload {
  user_id: number;
  reason?: "manual" | "expired" | "revoked" | "forced";
}

export interface OrgJoinRequest {
  organisation_id: number;
}

export interface OrgJoinResponse {
  organisation_id: number;
  room: string;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface SocketManagerOptions {
  url: string;
  path?: string;
  getToken: () => string | null | undefined;
  getUserId?: () => number | string | null | undefined;
  getOrganisationId?: () => number | string | null | undefined;
  /** Called when auth.logout is received for this session */
  onForcedLogout?: (payload: AuthLogoutPayload) => void;
  /** Called for every domain sync event after internal handlers */
  onEvent?: (envelope: SocketEventEnvelope) => void;
  transports?: Array<"websocket" | "polling">;
  reconnectionAttempts?: number;
  reconnectionDelayMax?: number;
}
