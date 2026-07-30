import { createDomainStore } from "./createDomainStore";
import type {
  EmployeeEventPayload,
  NotificationEventPayload,
  PayoutEventPayload,
  PayrollEventPayload,
  ReportEventPayload,
  TimesheetEventPayload,
} from "./types";

export interface DashboardSnapshot {
  id: string;
  organisation_id?: number;
  updated_at?: string;
  [key: string]: unknown;
}

/** Shared domain Zustand stores — mirrored by web and mobile. */
export const useEmployeeStore = createDomainStore<EmployeeEventPayload>("employee");
export const useTimesheetStore =
  createDomainStore<TimesheetEventPayload>("timesheet");
export const usePayrollStore = createDomainStore<PayrollEventPayload>("payroll");
export const useReportStore = createDomainStore<ReportEventPayload>("report");
export const usePayoutStore = createDomainStore<PayoutEventPayload>("payout");
export const useNotificationStore =
  createDomainStore<NotificationEventPayload>("notification");
export const useDashboardStore = createDomainStore<DashboardSnapshot>("dashboard");

export function resetDomainStores(): void {
  useEmployeeStore.getState().reset();
  useTimesheetStore.getState().reset();
  usePayrollStore.getState().reset();
  useReportStore.getState().reset();
  usePayoutStore.getState().reset();
  useNotificationStore.getState().reset();
  useDashboardStore.getState().reset();
}
