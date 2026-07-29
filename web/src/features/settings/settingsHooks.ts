import { useQuery } from "@tanstack/react-query";
import {
  holidayCalendarsApi,
  payrollCalendarsApi,
  earningRatesApi,
  awardRatesApi,
  regionsApi,
} from "@mytask/api";

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
