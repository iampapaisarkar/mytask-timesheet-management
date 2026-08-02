/**
 * Canonical Socket.IO event names — shared by backend, web, and mobile.
 * Domain-based naming: `<domain>.<action>`
 */
export const SOCKET_EVENTS = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",

  EMPLOYEE_CREATED: "employee.created",
  EMPLOYEE_UPDATED: "employee.updated",
  EMPLOYEE_DELETED: "employee.deleted",

  TIMESHEET_CREATED: "timesheet.created",
  TIMESHEET_UPDATED: "timesheet.updated",
  TIMESHEET_DELETED: "timesheet.deleted",

  PAYROLL_CREATED: "payroll.created",
  PAYROLL_UPDATED: "payroll.updated",

  REPORT_GENERATED: "report.generated",
  REPORT_UPDATED: "report.updated",

  PAYOUT_CREATED: "payout.created",
  PAYOUT_UPDATED: "payout.updated",

  NOTIFICATION_CREATED: "notification.created",

  DASHBOARD_UPDATED: "dashboard.updated",

  /** System Logs — internal / external / email audit rows */
  AUDIT_LOG_CREATED: "audit.log.created",

  /**
   * Background / clock-in location + activity store.
   * Refreshes day map, timeline, and tracking_logs (throttled on server).
   */
  TRACKING_UPDATED: "tracking.updated",

  /** Client → server: join an organisation room after membership validation */
  ORG_JOIN: "org.join",
  /** Client → server: leave an organisation room */
  ORG_LEAVE: "org.leave",
  /** Server → client: org join result */
  ORG_JOINED: "org.joined",
  ORG_LEFT: "org.left",
  ORG_ERROR: "org.error",
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Events that mutate shared domain data and should sync client stores/caches */
export const DOMAIN_SYNC_EVENTS = [
  SOCKET_EVENTS.EMPLOYEE_CREATED,
  SOCKET_EVENTS.EMPLOYEE_UPDATED,
  SOCKET_EVENTS.EMPLOYEE_DELETED,
  SOCKET_EVENTS.TIMESHEET_CREATED,
  SOCKET_EVENTS.TIMESHEET_UPDATED,
  SOCKET_EVENTS.TIMESHEET_DELETED,
  SOCKET_EVENTS.PAYROLL_CREATED,
  SOCKET_EVENTS.PAYROLL_UPDATED,
  SOCKET_EVENTS.REPORT_GENERATED,
  SOCKET_EVENTS.REPORT_UPDATED,
  SOCKET_EVENTS.PAYOUT_CREATED,
  SOCKET_EVENTS.PAYOUT_UPDATED,
  SOCKET_EVENTS.NOTIFICATION_CREATED,
  SOCKET_EVENTS.DASHBOARD_UPDATED,
  SOCKET_EVENTS.AUDIT_LOG_CREATED,
  SOCKET_EVENTS.TRACKING_UPDATED,
  SOCKET_EVENTS.AUTH_LOGOUT,
] as const;

export type DomainSyncEvent = (typeof DOMAIN_SYNC_EVENTS)[number];
