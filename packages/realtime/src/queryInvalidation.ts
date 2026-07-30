import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@mytask/hooks";
import { SOCKET_EVENTS, type DomainSyncEvent } from "./events";
import type { SocketEventEnvelope } from "./types";

/**
 * Map domain socket events → React Query invalidation prefixes.
 * Prefer prefix invalidation over full-list refetch of every key.
 */
export const EVENT_QUERY_INVALIDATIONS: Record<
  DomainSyncEvent,
  ReadonlyArray<readonly unknown[]>
> = {
  [SOCKET_EVENTS.EMPLOYEE_CREATED]: [["employees"], queryKeys.screens.employeeForm],
  [SOCKET_EVENTS.EMPLOYEE_UPDATED]: [["employees"], queryKeys.screens.employeeForm],
  [SOCKET_EVENTS.EMPLOYEE_DELETED]: [["employees"], queryKeys.screens.employeeForm],

  [SOCKET_EVENTS.TIMESHEET_CREATED]: [
    ["timesheets"],
    ["timesheet-management"],
    ["timesheet-day"],
    ["screens", "dashboard"],
    ["screens", "home"],
  ],
  [SOCKET_EVENTS.TIMESHEET_UPDATED]: [
    ["timesheets"],
    ["timesheet-management"],
    ["timesheet-day"],
    ["screens", "dashboard"],
    ["payouts", "eligible"],
  ],
  [SOCKET_EVENTS.TIMESHEET_DELETED]: [
    ["timesheets"],
    ["timesheet-management"],
    ["screens", "dashboard"],
  ],

  [SOCKET_EVENTS.PAYROLL_CREATED]: [
    ["employees"],
    ["payroll-calendars"],
    queryKeys.screens.employeeForm,
  ],
  [SOCKET_EVENTS.PAYROLL_UPDATED]: [
    ["employees"],
    ["payroll-calendars"],
    queryKeys.screens.employeeForm,
  ],

  [SOCKET_EVENTS.REPORT_GENERATED]: [["reports"]],
  [SOCKET_EVENTS.REPORT_UPDATED]: [["reports"]],

  [SOCKET_EVENTS.PAYOUT_CREATED]: [["payouts"], ["reports"]],
  [SOCKET_EVENTS.PAYOUT_UPDATED]: [["payouts"], ["reports"]],

  [SOCKET_EVENTS.NOTIFICATION_CREATED]: [
    queryKeys.notifications,
    queryKeys.notificationsList,
  ],

  [SOCKET_EVENTS.DASHBOARD_UPDATED]: [["screens", "dashboard"], ["screens", "home"]],

  [SOCKET_EVENTS.AUDIT_LOG_CREATED]: [["system-logs"]],

  [SOCKET_EVENTS.AUTH_LOGOUT]: [],
};

export function invalidateQueriesForEvent(
  queryClient: QueryClient,
  event: DomainSyncEvent,
): void {
  const prefixes = EVENT_QUERY_INVALIDATIONS[event];
  if (!prefixes?.length) return;
  for (const queryKey of prefixes) {
    void queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}

export function applyRealtimeEnvelopeToQueryClient(
  queryClient: QueryClient,
  envelope: SocketEventEnvelope,
): void {
  const event = envelope.event as DomainSyncEvent;
  if (!(event in EVENT_QUERY_INVALIDATIONS)) return;

  if (event === SOCKET_EVENTS.NOTIFICATION_CREATED && envelope.data) {
    const previous = queryClient.getQueryData<{
      data?: unknown[];
      unread_count?: number;
    }>(queryKeys.notificationsList);
    if (previous && Array.isArray(previous.data)) {
      queryClient.setQueryData(queryKeys.notificationsList, {
        data: [envelope.data, ...previous.data],
        unread_count: (previous.unread_count ?? 0) + 1,
      });
    }
  }

  // Audit writes are async (queue) — brief delay so refetch usually sees the row
  if (event === SOCKET_EVENTS.AUDIT_LOG_CREATED) {
    globalThis.setTimeout(() => {
      invalidateQueriesForEvent(queryClient, event);
    }, 350);
    return;
  }

  invalidateQueriesForEvent(queryClient, event);
}
