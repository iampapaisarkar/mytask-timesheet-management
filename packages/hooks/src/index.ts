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
} from "@mysheet/api";
import type { ListParams } from "@mysheet/types";

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
