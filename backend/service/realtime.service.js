/**
 * Realtime domain event helpers.
 * Event names must stay aligned with packages/realtime SOCKET_EVENTS.
 */
import { SocketIO } from "#socketio";

export const REALTIME_EVENTS = {
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
  AUDIT_LOG_CREATED: "audit.log.created",
  TRACKING_UPDATED: "tracking.updated",
};

function toPlain(entity) {
  if (!entity) return null;
  if (typeof entity.toJSON === "function") return entity.toJSON();
  return entity;
}

export function emitOrgEvent(
  organisationId,
  event,
  data,
  { actorUserId } = {},
) {
  if (!organisationId || !event) return;
  return SocketIO.emitToOrganisation(
    organisationId,
    event,
    toPlain(data),
    { actor_user_id: actorUserId ?? null },
  );
}

export function emitUserEvent(userId, event, data, extras = {}) {
  if (!userId || !event) return;
  return SocketIO.emitToUser(userId, event, toPlain(data), extras);
}

export function emitEmployeeCreated(organisationId, employee, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.EMPLOYEE_CREATED,
    employee,
    { actorUserId },
  );
}

export function emitEmployeeUpdated(organisationId, employee, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.EMPLOYEE_UPDATED,
    employee,
    { actorUserId },
  );
}

export function emitEmployeeDeleted(organisationId, employee, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.EMPLOYEE_DELETED,
    employee,
    { actorUserId },
  );
}

export function emitTimesheetCreated(organisationId, timesheet, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.TIMESHEET_CREATED,
    timesheet,
    { actorUserId },
  );
}

export function emitTimesheetUpdated(organisationId, timesheet, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.TIMESHEET_UPDATED,
    timesheet,
    { actorUserId },
  );
}

export function emitTimesheetDeleted(organisationId, timesheet, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.TIMESHEET_DELETED,
    timesheet,
    { actorUserId },
  );
}

export function emitPayoutCreated(organisationId, payout, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.PAYOUT_CREATED,
    payout,
    { actorUserId },
  );
}

export function emitPayoutUpdated(organisationId, payout, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.PAYOUT_UPDATED,
    payout,
    { actorUserId },
  );
}

export function emitReportGenerated(organisationId, report, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.REPORT_GENERATED,
    report,
    { actorUserId },
  );
}

export function emitReportUpdated(organisationId, report, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.REPORT_UPDATED,
    report,
    { actorUserId },
  );
}

export function emitPayrollUpdated(organisationId, payroll, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.PAYROLL_UPDATED,
    payroll,
    { actorUserId },
  );
}

export function emitDashboardUpdated(organisationId, snapshot = {}) {
  return emitOrgEvent(organisationId, REALTIME_EVENTS.DASHBOARD_UPDATED, {
    id: organisationId,
    ...snapshot,
  });
}

export function emitAuthLogout(userId, reason = "manual") {
  return emitUserEvent(userId, REALTIME_EVENTS.AUTH_LOGOUT, {
    user_id: userId,
    reason,
  });
}

/** Broadcast a new System Log row so org clients refetch live. */
export function emitAuditLogCreated(row, auditType) {
  if (!row) return;
  const data = {
    ...(typeof row.toJSON === "function" ? row.toJSON() : row),
    audit_type: auditType,
  };
  if (data.organisation_id) {
    return emitOrgEvent(
      data.organisation_id,
      REALTIME_EVENTS.AUDIT_LOG_CREATED,
      data,
      { actorUserId: data.user_id ?? null },
    );
  }
  if (data.user_id) {
    return emitUserEvent(data.user_id, REALTIME_EVENTS.AUDIT_LOG_CREATED, data, {
      organisation_id: data.organisation_id ?? null,
    });
  }
  return null;
}

/** Broadcast GPS / activity store so day map + timeline refresh live. */
export function emitTrackingUpdated(organisationId, payload, actorUserId) {
  return emitOrgEvent(
    organisationId,
    REALTIME_EVENTS.TRACKING_UPDATED,
    payload,
    { actorUserId },
  );
}

export default {
  REALTIME_EVENTS,
  emitOrgEvent,
  emitUserEvent,
  emitEmployeeCreated,
  emitEmployeeUpdated,
  emitEmployeeDeleted,
  emitTimesheetCreated,
  emitTimesheetUpdated,
  emitTimesheetDeleted,
  emitPayoutCreated,
  emitPayoutUpdated,
  emitReportGenerated,
  emitReportUpdated,
  emitPayrollUpdated,
  emitDashboardUpdated,
  emitAuthLogout,
  emitAuditLogCreated,
  emitTrackingUpdated,
};
