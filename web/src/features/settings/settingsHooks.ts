import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  holidayCalendarsApi,
  payrollCalendarsApi,
  earningRatesApi,
  awardRatesApi,
  regionsApi,
  organisationsApi,
  systemApi,
} from "@mytask/api";
import { useQuery } from "@tanstack/react-query";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const res = await regionsApi.list({ rows_per_page: 50, sort_by: "id" });
      return res.data.data;
    },
  });
}

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

export function useEarningRates() {
  return useQuery({
    queryKey: ["earning-rates"],
    queryFn: async () => {
      const res = await earningRatesApi.list({
        rows_per_page: 50,
        sort_by: "id",
      });
      return res.data.data;
    },
  });
}

export function useAwardRates() {
  return useQuery({
    queryKey: ["award-rates"],
    queryFn: async () => {
      const res = await awardRatesApi.list({
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

export function useCreateRegion() {
  const invalidate = useInvalidate(["regions"]);
  return useMutation({
    mutationFn: (payload: { name: string }) => regionsApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRegion() {
  const invalidate = useInvalidate(["regions"]);
  return useMutation({
    mutationFn: ({ id, name }: { id: string | number; name: string }) =>
      regionsApi.update(id, { name }),
    onSuccess: invalidate,
  });
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

export function usePullPayrollFromXero() {
  const invalidate = useInvalidate(["payroll-calendars"]);
  return useMutation({
    mutationFn: () => payrollCalendarsApi.pullFromXero({}),
    onSuccess: invalidate,
  });
}

export function useCreateEarningRate() {
  const invalidate = useInvalidate(["earning-rates"]);
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      earningRatesApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEarningRate() {
  const invalidate = useInvalidate(["earning-rates"]);
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string | number;
    } & Record<string, unknown>) => earningRatesApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useCreateAwardRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      awardRatesApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["award-rates"] });
      void qc.invalidateQueries({ queryKey: ["system", "earning-rates"] });
    },
  });
}

export function useUpdateAwardRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string | number;
    } & Record<string, unknown>) => awardRatesApi.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["award-rates"] });
      void qc.invalidateQueries({ queryKey: ["system", "earning-rates"] });
    },
  });
}

export type RoundingInterval = {
  id: number;
  name?: string;
  value?: number;
};

export type AwardRuleDay = {
  id: number;
  name?: string;
  code?: string;
  locked?: boolean;
  show_default?: boolean;
};

export type AwardRuleComparator = {
  id: number;
  name?: string;
  code?: string;
};

export type AwardRuleField = {
  id: number;
  name?: string;
  code?: string;
  category?: string;
  field_type?: { id?: number; name?: string; code?: string };
  comparators?: AwardRuleComparator[];
};

export type EarningRateOption = {
  id: number;
  name?: string;
  rate?: string | number;
};

export function useAwardRateRuleLookups(enabled = true) {
  const fields = useQuery({
    queryKey: ["system", "award-rate-rule-fields"],
    queryFn: async () => {
      const res = await systemApi.get("award-rate-rule-fields");
      return (res.data as { data: AwardRuleField[] }).data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
  const days = useQuery({
    queryKey: ["system", "award-rate-rule-days"],
    queryFn: async () => {
      const res = await systemApi.get("award-rate-rule-days");
      return (res.data as { data: AwardRuleDay[] }).data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
  const rounding = useQuery({
    queryKey: ["system", "rounding-intervals"],
    queryFn: async () => {
      const res = await systemApi.get("rounding-intervals");
      return (res.data as { data: RoundingInterval[] }).data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
  const earningRates = useQuery({
    queryKey: ["system", "earning-rates"],
    queryFn: async () => {
      const res = await systemApi.get("earning-rates", { paginate: false });
      return (res.data as { data: EarningRateOption[] }).data;
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    fields: fields.data || [],
    days: days.data || [],
    roundingIntervals: rounding.data || [],
    earningRates: earningRates.data || [],
    isLoading:
      fields.isLoading ||
      days.isLoading ||
      rounding.isLoading ||
      earningRates.isLoading,
    isError:
      fields.isError || days.isError || rounding.isError || earningRates.isError,
  };
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
