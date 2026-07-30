import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  holidayCalendarsApi,
  payrollCalendarsApi,
  organisationsApi,
  systemApi,
} from "@mytask/api";
import { useQuery } from "@tanstack/react-query";

export function useHolidayCalendars() {
  return useQuery({
    queryKey: ["holiday-calendars"],
    queryFn: async () => {
      const res = await holidayCalendarsApi.list({
        rows_per_page: 50,
        sort_by: "id",
      });
      return res.data.data;
    },
  });
}

export function usePayrollCalendars() {
  return useQuery({
    queryKey: ["payroll-calendars"],
    queryFn: async () => {
      const res = await payrollCalendarsApi.list({
        rows_per_page: 50,
        sort_by: "id",
      });
      return res.data.data;
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
