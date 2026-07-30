import type { QueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "./events";
import { applyRealtimeEnvelopeToQueryClient } from "./queryInvalidation";
import {
  useDashboardStore,
  useEmployeeStore,
  useNotificationStore,
  usePayrollStore,
  usePayoutStore,
  useReportStore,
  useTimesheetStore,
} from "./domainStores";
import type { SocketEventEnvelope } from "./types";

/**
 * Apply a realtime envelope to domain Zustand stores (incremental upsert/remove).
 * Also invalidates TanStack Query keys so existing screens stay live.
 */
export function applyRealtimeToClientState(
  queryClient: QueryClient,
  envelope: SocketEventEnvelope,
): void {
  const { event, data } = envelope;
  const entity = (data ?? {}) as { id?: number | string };

  switch (event) {
    case SOCKET_EVENTS.EMPLOYEE_CREATED:
    case SOCKET_EVENTS.EMPLOYEE_UPDATED:
      if (entity.id != null) {
        useEmployeeStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;
    case SOCKET_EVENTS.EMPLOYEE_DELETED:
      if (entity.id != null) useEmployeeStore.getState().remove(entity.id);
      break;

    case SOCKET_EVENTS.TIMESHEET_CREATED:
    case SOCKET_EVENTS.TIMESHEET_UPDATED:
      if (entity.id != null) {
        useTimesheetStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;
    case SOCKET_EVENTS.TIMESHEET_DELETED:
      if (entity.id != null) useTimesheetStore.getState().remove(entity.id);
      break;

    case SOCKET_EVENTS.PAYROLL_CREATED:
    case SOCKET_EVENTS.PAYROLL_UPDATED:
      if (entity.id != null) {
        usePayrollStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;

    case SOCKET_EVENTS.REPORT_GENERATED:
    case SOCKET_EVENTS.REPORT_UPDATED:
      if (entity.id != null) {
        useReportStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;

    case SOCKET_EVENTS.PAYOUT_CREATED:
    case SOCKET_EVENTS.PAYOUT_UPDATED:
      if (entity.id != null) {
        usePayoutStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;

    case SOCKET_EVENTS.NOTIFICATION_CREATED:
      if (entity.id != null) {
        useNotificationStore.getState().upsert({
          ...(typeof data === "object" && data ? data : {}),
          id: entity.id,
        });
      }
      break;

    case SOCKET_EVENTS.DASHBOARD_UPDATED:
      useDashboardStore.getState().upsert({
        id: String(envelope.organisation_id ?? "dashboard"),
        organisation_id: envelope.organisation_id ?? undefined,
        updated_at: envelope.emitted_at,
        ...(typeof data === "object" && data ? data : {}),
      });
      break;

    default:
      break;
  }

  applyRealtimeEnvelopeToQueryClient(queryClient, envelope);
}
