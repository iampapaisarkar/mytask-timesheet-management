import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  organisationsApi,
  timesheetsApi,
  timesheetManagementApi,
  employeesApi,
  customersApi,
  jobsApi,
  managementGroupsApi,
  systemApi,
} from "@mytask/api";
import type { ListParams } from "@mytask/types";

export const queryKeys = {
  me: ["auth", "me"] as const,
  organisations: (params?: ListParams) => ["organisations", params] as const,
  timesheets: (params?: ListParams) => ["timesheets", params] as const,
  timesheet: (id: string | number) => ["timesheets", id] as const,
  timesheetManagement: (params?: ListParams) =>
    ["timesheet-management", params] as const,
  employees: (params?: ListParams) => ["employees", params] as const,
  customers: (params?: ListParams) => ["customers", params] as const,
  jobs: (params?: ListParams) => ["jobs", params] as const,
  managementGroups: (params?: ListParams) =>
    ["management-groups", params] as const,
};

export function useAuthUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const res = await authApi.me();
      return res.data.data;
    },
    enabled,
  });
}

export function useOrganisations(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organisations(params),
    queryFn: async () => {
      const res = await organisationsApi.list(params);
      return res.data.data;
    },
    enabled,
  });
}

export function useSystemStates(enabled = true) {
  return useQuery({
    queryKey: ["system", "states"] as const,
    queryFn: async () => {
      const res = await systemApi.get("states");
      return (res.data as { data: Array<{ id: number; name: string }> }).data;
    },
    enabled,
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
    queryFn: async () => {
      const res = await timesheetsApi.list(params);
      return res.data.data;
    },
    enabled,
  });
}

export function useTimesheet(id: string | number | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheet(id || "unknown"),
    queryFn: async () => {
      const res = await timesheetsApi.get(id!);
      return (res.data as { data: unknown }).data;
    },
    enabled: enabled && id != null && id !== "",
  });
}

export function useTimesheetManagement(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheetManagement(params),
    queryFn: async () => {
      const res = await timesheetManagementApi.list(params);
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
    queryKey: ["timesheet-management", id] as const,
    queryFn: async () => {
      const res = await timesheetManagementApi.get(id!);
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
    mutationFn: async (id: string | number) => {
      const res = await timesheetManagementApi.submitForApproval(id);
      return res.data;
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ["timesheet-management", id] });
      void qc.invalidateQueries({ queryKey: ["timesheet-management"] });
    },
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string | number;
      reason?: string;
    }) => {
      const res = await timesheetManagementApi.approve(id, {
        approval_reason: reason || "",
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
      reason,
    }: {
      id: string | number;
      reason?: string;
    }) => {
      const res = await timesheetManagementApi.reject(id, {
        reject_reason: reason || "",
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
    queryFn: async () => {
      const res = await timesheetManagementApi.employeePayrollCycles(employeeId!);
      return (res.data as { data: unknown }).data;
    },
    enabled: employeeId != null && employeeId !== "",
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

export function useEmployees(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees(params),
    queryFn: async () => {
      const res = await employeesApi.list(params);
      return res.data.data;
    },
    enabled,
  });
}

export function useCustomers(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: async () => {
      const res = await customersApi.list(params);
      return res.data.data;
    },
    enabled,
  });
}

export function useJobs(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobs(params),
    queryFn: async () => {
      const res = await jobsApi.list(params);
      return res.data.data;
    },
    enabled,
  });
}

export function useManagementGroups(params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.managementGroups(params),
    queryFn: async () => {
      const res = await managementGroupsApi.list(params);
      return res.data.data;
    },
    enabled,
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

export { useQuery, useMutation, useQueryClient };
