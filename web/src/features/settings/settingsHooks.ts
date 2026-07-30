import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  holidayCalendarsApi,
  payrollCalendarsApi,
  organisationsApi,
  systemApi,
} from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import type { ListParams } from "@mytask/types";
import { extractPagination, type PaginatedList } from "@mytask/utils";
import { useQuery } from "@tanstack/react-query";

function toPaginatedList(res: {
  data: {
    data?: unknown;
    pagination?: unknown;
    info?: { pagination?: unknown };
    meta?: { pagination?: unknown };
  };
}): PaginatedList {
  return {
    data: Array.isArray(res.data.data) ? res.data.data : [],
    pagination: extractPagination(res.data),
  };
}

export function useHolidayCalendars(params: ListParams = {}) {
  const listParams = {
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    sort_by: "id",
    ...params,
  };
  return useQuery({
    queryKey: ["holiday-calendars", listParams],
    queryFn: async () => {
      const res = await holidayCalendarsApi.list(listParams);
      return toPaginatedList(res);
    },
  });
}

export function usePayrollCalendars(params: ListParams = {}) {
  const listParams = {
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    sort_by: "id",
    ...params,
  };
  return useQuery({
    queryKey: ["payroll-calendars", listParams],
    queryFn: async () => {
      const res = await payrollCalendarsApi.list(listParams);
      return toPaginatedList(res);
    },
  });
}

export function usePayCycles() {
  return useQuery({
    queryKey: ["system", "pay-cycles"],
    queryFn: async () => {
      const res = await systemApi.get("pay-cycles");
      return (res.data as { data: Array<{ id: number; name: string; code: string }> })
        .data;
    },
  });
}

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => {
    for (const key of keys) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useCreateHolidayCalendar() {
  const invalidate = useInvalidate(["holiday-calendars"]);
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      holidayCalendarsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateHolidayCalendar() {
  const invalidate = useInvalidate(["holiday-calendars"]);
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string | number;
    } & Record<string, unknown>) => holidayCalendarsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useCreatePayrollCalendar() {
  const invalidate = useInvalidate(["payroll-calendars"]);
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      payrollCalendarsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateOrganisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      organisationsApi.update(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organisation"] });
    },
  });
}

export function useUpdateOrganisationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      organisationsApi.updateSettings(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["organisation"] });
    },
  });
}
