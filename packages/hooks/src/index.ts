import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mytask/api";
import type {
  DashboardOverviewView,
  EmployeeFormLookupsView,
  HomeBootstrapView,
  ListParams,
  OrgBootstrapView,
  TimesheetDayEditorView,
} from "@mytask/types";

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
  notificationsList: ["notifications", "list"] as const,
  holidayCalendars: ["holiday-calendars"] as const,
  payrollCalendars: ["payroll-calendars"] as const,
  payouts: (params?: ListParams) => ["payouts", params] as const,
  payoutsEligible: ["payouts", "eligible"] as const,
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
  qc.setQueryData(queryKeys.notificationsList, {
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
      return res.data.data;
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
      return res.data.data;
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
    mutationFn: async (id: string | number) => {
      const res = await timesheetsApi.submitForApproval(id);
      return res.data;
    },
    onSuccess: (_data, id) => {
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
    }: {
      id: string | number;
      employeeId: string | number;
    }) => {
      const res = await timesheetManagementApi.submitForApproval(id, {
        employee_id: employeeId,
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
      reason?: string;
    }) => {
      const res = await timesheetManagementApi.approve(id, {
        employee_id: employeeId,
        remarks: reason || "",
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
      reason?: string;
    }) => {
      const res = await timesheetManagementApi.reject(id, {
        employee_id: employeeId,
        remarks: reason || "",
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
      remarks?: string;
    }) => {
      const res = await timesheetManagementApi.revert(id, {
        employee_id: employeeId,
        remarks: remarks || "",
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
      return res.data.data;
    },
    enabled,
  });
}

export function useCustomers(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: async ({ signal }) => {
      const res = await customersApi.list(params, { signal });
      return res.data.data;
    },
    enabled,
  });
}

export function useJobs(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobs(params),
    queryFn: async ({ signal }) => {
      const res = await jobsApi.list(params, { signal });
      return res.data.data;
    },
    enabled,
  });
}

export function usePayouts(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payouts(params),
    queryFn: async ({ signal }) => {
      const res = await payoutsApi.list(params, { signal });
      return res.data.data;
    },
    enabled,
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

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      timesheet_id: string | number;
      notes?: string;
    }) => {
      const res = await payoutsApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await payoutsApi.markPaid(id);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payouts"] });
    },
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

export { createAppQueryClient } from "./queryClient";
export { useQuery, useMutation, useQueryClient };
