import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  authApi,
  organisationsApi,
  timesheetsApi,
  timesheetManagementApi,
  employeesApi,
  customersApi,
  jobsApi,
  systemApi,
  screensApi,
  payoutsApi,
  systemLogsApi,
  notificationsApi,
  subscriptionApi,
} from "@mytask/api";
import type {
  DashboardGraphsView,
  DashboardOverviewView,
  DashboardPendingView,
  DashboardRecentView,
  DashboardSummaryView,
  EmployeeFormLookupsView,
  HomeBootstrapView,
  ListParams,
  OrgBootstrapView,
  PlansCatalogueResponse,
  SubscriptionView,
  BillingHistoryItem,
  TimesheetDayEditorView,
} from "@mytask/types";
import {
  extractPagination,
  type PaginatedList,
} from "@mytask/utils";

function toPaginatedList(res: {
  data: {
    data?: unknown;
    pagination?: unknown;
    info?: { pagination?: unknown };
    meta?: { pagination?: unknown };
  };
}): PaginatedList {
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return {
    data: rows,
    pagination: extractPagination(res.data),
  };
}

export const queryKeys = {
  me: ["auth", "me"] as const,
  organisations: (params?: ListParams) => ["organisations", params] as const,
  organisation: (orgCode: string) => ["organisation", orgCode] as const,
  organisationInvitations: ["organisation-invitations"] as const,
  timesheets: (params?: ListParams) => ["timesheets", params] as const,
  timesheet: (id: string | number) => ["timesheets", id] as const,
  timesheetDay: (mode: string, dayId: string | number) =>
    ["timesheet-day", mode, dayId] as const,
  timesheetManagement: (params?: ListParams) =>
    ["timesheet-management", params] as const,
  timesheetManagementItem: (id: string | number) =>
    ["timesheet-management", id] as const,
  employees: (params?: ListParams) => ["employees", params] as const,
  customers: (params?: ListParams) => ["customers", params] as const,
  jobs: (params?: ListParams) => ["jobs", params] as const,
  system: (path: string) => ["system", path] as const,
  notifications: ["notifications"] as const,
  notificationsPreview: ["notifications", "preview"] as const,
  notificationsList: (params?: ListParams) =>
    ["notifications", "list", params] as const,
  holidayCalendars: ["holiday-calendars"] as const,
  payrollCalendars: ["payroll-calendars"] as const,
  payouts: (params?: ListParams) => ["payouts", params] as const,
  payoutsEligible: ["payouts", "eligible"] as const,
  systemLogs: {
    summary: (params?: ListParams) => ["system-logs", "summary", params] as const,
    internal: (params?: ListParams) =>
      ["system-logs", "internal", params] as const,
    external: (params?: ListParams) =>
      ["system-logs", "external", params] as const,
    email: (params?: ListParams) => ["system-logs", "email", params] as const,
    detail: (type: string, id: string | number) =>
      ["system-logs", type, id] as const,
  },
  screens: {
    orgBootstrap: (orgCode: string) =>
      ["screens", "org-bootstrap", orgCode] as const,
    home: ["screens", "home"] as const,
    employeeForm: ["screens", "employee-form"] as const,
    timesheetDayEditor: (
      mode: string,
      dayId: string | number,
      employeeId?: string | number,
    ) => ["screens", "timesheet-day-editor", mode, dayId, employeeId] as const,
    dashboard: (orgCode: string) =>
      ["screens", "dashboard", orgCode] as const,
    dashboardSummary: (orgCode: string) =>
      ["screens", "dashboard", "summary", orgCode] as const,
    dashboardGraphs: (orgCode: string) =>
      ["screens", "dashboard", "graphs", orgCode] as const,
    dashboardRecent: (orgCode: string) =>
      ["screens", "dashboard", "recent", orgCode] as const,
    dashboardPending: (orgCode: string) =>
      ["screens", "dashboard", "pending", orgCode] as const,
  },
  subscription: {
    plans: ["subscription", "plans"] as const,
    current: ["subscription", "current"] as const,
    usage: ["subscription", "usage"] as const,
    billing: (params?: ListParams) =>
      ["subscription", "billing", params] as const,
  },
};

const ORG_LIST_SEED_PARAMS: ListParams = { rows_per_page: 50 };

function seedOrgBootstrapCaches(
  qc: ReturnType<typeof useQueryClient>,
  orgCode: string,
  data: OrgBootstrapView,
) {
  qc.setQueryData(queryKeys.organisation(orgCode), data.organisation);
  qc.setQueryData(
    queryKeys.organisations(ORG_LIST_SEED_PARAMS),
    data.organisations,
  );
  qc.setQueryData(queryKeys.notificationsPreview, {
    data: data.notifications.items,
    unread_count: data.notifications.unread_count,
  });
}

function seedHomeCaches(
  qc: ReturnType<typeof useQueryClient>,
  data: HomeBootstrapView,
) {
  qc.setQueryData(
    queryKeys.organisations(ORG_LIST_SEED_PARAMS),
    data.organisations,
  );
  qc.setQueryData(queryKeys.organisationInvitations, data.invitations);
}

export function useOrgBootstrap(orgCode: string, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.screens.orgBootstrap(orgCode),
    queryFn: async ({ signal }) => {
      const res = await screensApi.orgBootstrap(orgCode, { signal });
      const data = res.data.data as OrgBootstrapView;
      seedOrgBootstrapCaches(qc, orgCode, data);
      return data;
    },
    enabled: enabled && Boolean(orgCode),
    staleTime: 30_000,
  });
}

export function useHomeBootstrap(enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.screens.home,
    queryFn: async ({ signal }) => {
      const res = await screensApi.home({ signal });
      const data = res.data.data as HomeBootstrapView;
      seedHomeCaches(qc, data);
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useEmployeeFormLookups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.screens.employeeForm,
    queryFn: async ({ signal }) => {
      const res = await screensApi.employeeForm({ signal });
      return res.data.data as EmployeeFormLookupsView;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useTimesheetDayEditorScreen(
  params: {
    mode: "self" | "management";
    dayId?: string | number | null;
    employeeId?: string | number;
  },
  enabled = true,
) {
  const { mode, dayId, employeeId } = params;
  return useQuery({
    queryKey: queryKeys.screens.timesheetDayEditor(
      mode,
      dayId || "unknown",
      employeeId,
    ),
    queryFn: async ({ signal }) => {
      const res = await screensApi.timesheetDayEditor(
        {
          mode,
          timesheet_day_id: dayId!,
          employee_id: employeeId,
        },
        { signal },
      );
      return res.data.data as TimesheetDayEditorView;
    },
    enabled: enabled && dayId != null && dayId !== "",
  });
}

export function useDashboardOverview(orgCode: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.screens.dashboard(orgCode),
    queryFn: async ({ signal }) => {
      const res = await screensApi.dashboard({ signal });
      return res.data.data as DashboardOverviewView;
    },
    enabled: enabled && Boolean(orgCode),
    staleTime: 30_000,
  });
}

/**
 * Enterprise parallel dashboard load — four independent slices via useQueries.
 * KPI strip / charts / activity / pending each render as soon as their slice arrives.
 */
export function useDashboardParallel(orgCode: string, enabled = true) {
  const active = enabled && Boolean(orgCode);
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.screens.dashboardSummary(orgCode),
        queryFn: async ({ signal }: { signal?: AbortSignal }) => {
          const res = await screensApi.dashboardSummary({ signal });
          return res.data.data as DashboardSummaryView;
        },
        enabled: active,
        staleTime: 30_000,
      },
      {
        queryKey: queryKeys.screens.dashboardGraphs(orgCode),
        queryFn: async ({ signal }: { signal?: AbortSignal }) => {
          const res = await screensApi.dashboardGraphs({ signal });
          return res.data.data as DashboardGraphsView;
        },
        enabled: active,
        staleTime: 30_000,
      },
      {
        queryKey: queryKeys.screens.dashboardRecent(orgCode),
        queryFn: async ({ signal }: { signal?: AbortSignal }) => {
          const res = await screensApi.dashboardRecent({ signal });
          return res.data.data as DashboardRecentView;
        },
        enabled: active,
        staleTime: 30_000,
      },
      {
        queryKey: queryKeys.screens.dashboardPending(orgCode),
        queryFn: async ({ signal }: { signal?: AbortSignal }) => {
          const res = await screensApi.dashboardPending({ signal });
          return res.data.data as DashboardPendingView;
        },
        enabled: active,
        staleTime: 30_000,
      },
    ],
  });

  const [summaryQ, graphsQ, recentQ, pendingQ] = results;

  const overview: DashboardOverviewView | undefined =
    summaryQ.data || graphsQ.data || recentQ.data || pendingQ.data
      ? {
          source: summaryQ.data?.source ?? graphsQ.data?.source,
          role: summaryQ.data?.role ?? graphsQ.data?.role ?? null,
          display_currency: summaryQ.data?.display_currency ?? null,
          kpis: summaryQ.data?.kpis ?? {
            approved: 0,
            draft: 0,
            submitted: 0,
            rejected: 0,
            total: 0,
            approval_rate_pct: 0,
            employees: 0,
            worked_hours_month: 0,
            approved_hours_month: 0,
            pending_hours_month: 0,
            payroll_this_month: 0,
            pending_payout_amount: 0,
            pending_payouts: 0,
            paid_payouts: 0,
          },
          status_donut: graphsQ.data?.status_donut ?? [],
          weekly_progress: graphsQ.data?.weekly_progress ?? [],
          monthly_progress: graphsQ.data?.monthly_progress ?? [],
          productivity_trend: graphsQ.data?.productivity_trend ?? [],
          payroll_trend: graphsQ.data?.payroll_trend ?? [],
          payout_status_donut: graphsQ.data?.payout_status_donut ?? [],
          team_activity: recentQ.data?.team_activity ?? [],
          recent_activity: recentQ.data?.recent_activity ?? [],
          latest_payout: recentQ.data?.latest_payout ?? null,
          quick_links_hint: pendingQ.data?.quick_links_hint ?? {
            has_pending_approvals: false,
            open_timesheet_id: null,
          },
        }
      : undefined;

  return {
    summaryQuery: summaryQ,
    graphsQuery: graphsQ,
    recentQuery: recentQ,
    pendingQuery: pendingQ,
    overview,
    isLoading: results.some((q) => q.isLoading),
    isFetching: results.some((q) => q.isFetching),
    isError: results.some((q) => q.isError),
    error: results.find((q) => q.error)?.error,
    refetch: () => Promise.all(results.map((q) => q.refetch())),
  };
}


export function useAuthUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      const res = await authApi.me({ signal });
      return res.data.data;
    },
    enabled,
  });
}

export function useOrganisations(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organisations(params),
    queryFn: async ({ signal }) => {
      const res = await organisationsApi.list(params, { signal });
      return res.data.data;
    },
    enabled,
  });
}

export function useSystemStates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.system("states"),
    queryFn: async ({ signal }) => {
      const res = await systemApi.get("states", undefined, { signal });
      return (res.data as { data: Array<{ id: number; name: string }> }).data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateOrganisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await organisationsApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organisations"] });
      void qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useTimesheets(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheets(params),
    queryFn: async ({ signal }) => {
      const res = await timesheetsApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function useTimesheet(id: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheet(id || "unknown"),
    queryFn: async ({ signal }) => {
      const res = await timesheetsApi.get(id!, undefined, { signal });
      return (res.data as { data: unknown }).data;
    },
    enabled: enabled && id != null && id !== "",
  });
}

export function useTimesheetManagement(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheetManagement(params),
    queryFn: async ({ signal }) => {
      const res = await timesheetManagementApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function useTimesheetManagementItem(
  id: string | number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.timesheetManagementItem(id || "unknown"),
    queryFn: async ({ signal }) => {
      const res = await timesheetManagementApi.get(id!, { signal });
      return (res.data as { data: unknown }).data;
    },
    enabled: enabled && id != null && id !== "",
  });
}

export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      idOrVars: string | number | { id: string | number; remarks: string },
    ) => {
      const id =
        typeof idOrVars === "object" ? idOrVars.id : idOrVars;
      const remarks =
        typeof idOrVars === "object" ? idOrVars.remarks : undefined;
      const res = await timesheetsApi.submitForApproval(
        id,
        remarks != null ? { remarks } : {},
      );
      return res.data;
    },
    onSuccess: (_data, idOrVars) => {
      const id = typeof idOrVars === "object" ? idOrVars.id : idOrVars;
      void qc.invalidateQueries({ queryKey: queryKeys.timesheet(id) });
      void qc.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useSubmitTimesheetManagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      remarks,
    }: {
      id: string | number;
      employeeId: string | number;
      remarks: string;
    }) => {
      const res = await timesheetManagementApi.submitForApproval(id, {
        employee_id: employeeId,
        remarks,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ["timesheet-management", vars.id],
      });
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      reason,
    }: {
      id: string | number;
      employeeId: string | number;
      reason: string;
    }) => {
      const res = await timesheetManagementApi.approve(id, {
        employee_id: employeeId,
        remarks: reason,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ["timesheet-management", vars.id],
      });
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useRejectTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      reason,
    }: {
      id: string | number;
      employeeId: string | number;
      reason: string;
    }) => {
      const res = await timesheetManagementApi.reject(id, {
        employee_id: employeeId,
        remarks: reason,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ["timesheet-management", vars.id],
      });
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useRevertTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      remarks,
    }: {
      id: string | number;
      employeeId: string | number;
      remarks: string;
    }) => {
      const res = await timesheetManagementApi.revert(id, {
        employee_id: employeeId,
        remarks,
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ["timesheet-management", vars.id],
      });
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useCreateTimesheetManagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await timesheetManagementApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useEmployeePayrollCycles(employeeId: string | number | undefined) {
  return useQuery({
    queryKey: ["employee-payroll-cycles", employeeId] as const,
    queryFn: async ({ signal }) => {
      const res = await timesheetManagementApi.employeePayrollCycles(
        employeeId!,
        { signal },
      );
      return (res.data as { data: unknown }).data;
    },
    enabled: employeeId != null && employeeId !== "",
  });
}

export function useSystemLookup<T = unknown[]>(path: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.system(path),
    queryFn: async ({ signal }) => {
      const res = await systemApi.get(path, undefined, { signal });
      return (res.data as { data: T }).data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await customersApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Record<string, unknown>;
    }) => {
      const res = await customersApi.update(id, payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await jobsApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Record<string, unknown>;
    }) => {
      const res = await jobsApi.update(id, payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await employeesApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Record<string, unknown>;
    }) => {
      const res = await employeesApi.update(id, payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useInviteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await employeesApi.invite(id);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useSearchEmployeeByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await employeesApi.searchByEmail({ email });
      return (res.data as { data: Record<string, unknown> }).data;
    },
  });
}

export function useEmployees(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees(params),
    queryFn: async ({ signal }) => {
      const res = await employeesApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function useCustomers(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: async ({ signal }) => {
      const res = await customersApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function useNotifications(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notificationsList(params),
    queryFn: async ({ signal }) => {
      const res = await notificationsApi.list(params, { signal });
      const list = toPaginatedList(res);
      const unread =
        res.data && typeof res.data === "object" && "unread_count" in res.data
          ? Number((res.data as { unread_count?: number }).unread_count)
          : undefined;
      return {
        ...list,
        unread_count: Number.isFinite(unread) ? unread : undefined,
      };
    },
    enabled,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await notificationsApi.markAs(id, "read");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await notificationsApi.markAllAs("read");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useJobs(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobs(params),
    queryFn: async ({ signal }) => {
      const res = await jobsApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function usePayouts(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payouts(params),
    queryFn: async ({ signal }) => {
      const res = await payoutsApi.list(params, { signal });
      return toPaginatedList(res);
    },
    enabled,
  });
}

export function usePayout(id: string | number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["payouts", "detail", id] as const,
    queryFn: async ({ signal }) => {
      const res = await payoutsApi.get(id!, { signal });
      return res.data.data;
    },
    enabled: Boolean(id) && enabled,
  });
}

export function useEligiblePayouts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payoutsEligible,
    queryFn: async ({ signal }) => {
      const res = await payoutsApi.eligible({ signal });
      return res.data.data;
    },
    enabled,
  });
}

function invalidatePayoutQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["payouts"] });
  void qc.invalidateQueries({ queryKey: ["screens", "dashboard"] });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      timesheet_id: string | number;
      notes?: string;
      as_draft?: boolean;
    }) => {
      const res = await payoutsApi.create(payload);
      return res.data;
    },
    onSuccess: () => invalidatePayoutQueries(qc),
  });
}

export function usePayoutTransition(
  action: "submit" | "approve" | "release" | "markPaid" | "cancel",
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string | number;
      notes?: string;
    }) => {
      const payload = args.notes ? { notes: args.notes } : {};
      const fn =
        action === "submit"
          ? payoutsApi.submit
          : action === "approve"
            ? payoutsApi.approve
            : action === "release"
              ? payoutsApi.release
              : action === "markPaid"
                ? payoutsApi.markPaid
                : payoutsApi.cancel;
      const res = await fn(args.id, payload);
      return res.data;
    },
    onSuccess: () => invalidatePayoutQueries(qc),
  });
}

export function useMarkPayoutPaid() {
  return usePayoutTransition("markPaid");
}

export function useSubmitPayout() {
  return usePayoutTransition("submit");
}

export function useApprovePayout() {
  return usePayoutTransition("approve");
}

export function useReleasePayout() {
  return usePayoutTransition("release");
}

export function useCancelPayout() {
  return usePayoutTransition("cancel");
}

export function useExportPayouts() {
  return useMutation({
    mutationFn: async (params: ListParams = {}) => {
      const res = await payoutsApi.exportCsv(params);
      return res.data as Blob;
    },
  });
}

export function useSystemLogsSummary(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.systemLogs.summary(params),
    queryFn: async ({ signal }) => {
      const res = await systemLogsApi.summary(params, { signal });
      return res.data.data as Record<string, unknown>;
    },
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useSystemLogsInternal(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.systemLogs.internal(params),
    queryFn: async ({ signal }) => {
      const res = await systemLogsApi.listInternal(params, { signal });
      const pagination = extractPagination(res.data);
      return {
        rows: (Array.isArray(res.data.data) ? res.data.data : []) as Record<
          string,
          unknown
        >[],
        pagination,
      };
    },
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useSystemLogsExternal(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.systemLogs.external(params),
    queryFn: async ({ signal }) => {
      const res = await systemLogsApi.listExternal(params, { signal });
      const pagination = extractPagination(res.data);
      return {
        rows: (Array.isArray(res.data.data) ? res.data.data : []) as Record<
          string,
          unknown
        >[],
        pagination,
      };
    },
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useSystemLogsEmail(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.systemLogs.email(params),
    queryFn: async ({ signal }) => {
      const res = await systemLogsApi.listEmail(params, { signal });
      const pagination = extractPagination(res.data);
      return {
        rows: (Array.isArray(res.data.data) ? res.data.data : []) as Record<
          string,
          unknown
        >[],
        pagination,
      };
    },
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      qc.clear();
    },
  });
}

export function usePlansCatalogue(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.plans,
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.listPlans({ signal });
      return res.data.data as PlansCatalogueResponse;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useCurrentSubscription(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.current,
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.current({ signal });
      return res.data.data as SubscriptionView;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useSubscriptionUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.usage,
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.usage({ signal });
      return res.data.data;
    },
    enabled,
  });
}

export function useBillingHistory(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.billing(params),
    queryFn: async ({ signal }) => {
      const res = await subscriptionApi.billingHistory(params, { signal });
      return {
        data: (Array.isArray(res.data.data) ? res.data.data : []) as BillingHistoryItem[],
        pagination: extractPagination(res.data),
      };
    },
    enabled,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (payload: {
      billing_interval: "month" | "year";
      success_url?: string;
      cancel_url?: string;
    }) => {
      const res = await subscriptionApi.checkout(payload);
      return res.data.data;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async (payload: { return_url?: string } = {}) => {
      const res = await subscriptionApi.portal(payload);
      return res.data.data;
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { immediate?: boolean } = {}) => {
      const res = await subscriptionApi.cancel(payload);
      return res.data.data as SubscriptionView;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export { createAppQueryClient } from "./queryClient";
export { useQuery, useMutation, useQueryClient };
