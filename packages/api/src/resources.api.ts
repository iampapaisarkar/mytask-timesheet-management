import { getApiClient } from "./client";
import { buildListQuery } from "@mytask/utils";
import type { ApiResponse, ListParams } from "@mytask/types";

function resourceApi(base: string) {
  return {
    list(params: ListParams = {}) {
      return getApiClient().get<ApiResponse<unknown[]>>(`${base}/list`, {
        params: buildListQuery(params),
      });
    },
    create(payload: Record<string, unknown>) {
      return getApiClient().post<ApiResponse<unknown>>(`${base}/create`, payload);
    },
    update(id: string | number, payload: Record<string, unknown>) {
      return getApiClient().post<ApiResponse<unknown>>(`${base}/${id}/update`, payload);
    },
  };
}

export const employeesApi = {
  ...resourceApi("/employees"),
  invite(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(`/employees/${id}/invite`, payload);
  },
  searchByEmail(payload: { email: string }) {
    return getApiClient().post("/employees/search-user-by-email", payload);
  },
};

export const customersApi = resourceApi("/customers");
export const jobsApi = resourceApi("/jobs");
export const managementGroupsApi = resourceApi("/management-groups");
export const regionsApi = resourceApi("/region");
export const holidayCalendarsApi = resourceApi("/holiday-calendars");
export const earningRatesApi = resourceApi("/earning-rates");
export const awardRatesApi = resourceApi("/award-rates");

export const payrollCalendarsApi = {
  list(params: ListParams = {}) {
    return getApiClient().get("/payroll-calendars/list", {
      params: buildListQuery(params),
    });
  },
  create(payload: Record<string, unknown>) {
    return getApiClient().post("/payroll-calendars/create", payload);
  },
  pullFromXero(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/payroll-calendars/pull-from-xero-to-app", payload);
  },
};

export const timesheetsApi = {
  list(params: ListParams = {}) {
    return getApiClient().get("/timesheets/list", { params: buildListQuery(params) });
  },
  get(id: string | number) {
    return getApiClient().get(`/timesheets/${id}/get`);
  },
  getDay(id: string | number, params?: Record<string, unknown>) {
    return getApiClient().get(`/timesheets/${id}/get-day`, { params });
  },
  save(id: string | number, payload: Record<string, unknown>) {
    return getApiClient().post(`/timesheets/${id}/save`, payload);
  },
  submitForApproval(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(`/timesheets/${id}/submit-for-approval`, payload);
  },
};

export const timesheetManagementApi = {
  list(params: ListParams = {}) {
    return getApiClient().get("/timesheet-management/list", {
      params: buildListQuery(params),
    });
  },
  get(id: string | number) {
    return getApiClient().get(`/timesheet-management/${id}/get`);
  },
  getDay(id: string | number, params?: Record<string, unknown>) {
    return getApiClient().get(`/timesheet-management/${id}/get-day`, { params });
  },
  create(payload: Record<string, unknown>) {
    return getApiClient().post("/timesheet-management/create", payload);
  },
  save(id: string | number, payload: Record<string, unknown>) {
    return getApiClient().post(`/timesheet-management/${id}/save`, payload);
  },
  submitForApproval(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(
      `/timesheet-management/${id}/submit-for-approval`,
      payload,
    );
  },
  approve(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(`/timesheet-management/${id}/approve`, payload);
  },
  reject(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(`/timesheet-management/${id}/reject`, payload);
  },
  revert(id: string | number, payload: Record<string, unknown> = {}) {
    return getApiClient().post(`/timesheet-management/${id}/revert`, payload);
  },
  employeePayrollCycles(employeeId: string | number) {
    return getApiClient().get(
      `/timesheet-management/${employeeId}/employee-payroll-cycles`,
    );
  },
};

export const systemApi = {
  get(path: string, params?: Record<string, unknown>) {
    return getApiClient().get(`/system/${path}`, { params });
  },
};

export const notificationsApi = {
  list(params: ListParams = {}) {
    return getApiClient().get("/notifications/list", {
      params: buildListQuery(params),
    });
  },
  markAs(id: string | number, payload: Record<string, unknown>) {
    return getApiClient().post(`/notifications/${id}/mark-as`, payload);
  },
  markAllAs(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/notifications/mark-all-as", payload);
  },
};

export const reportsApi = {
  rateByPerTimesheetDay(params: Record<string, unknown> = {}) {
    return getApiClient().get("/reports/rate-by-per-timesheet-day", { params });
  },
};

export const xeroApi = {
  connect(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/xero/connect", payload);
  },
  finalize(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/xero/finalize", payload);
  },
  disconnect(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/xero/disconnect", payload);
  },
  fetchEarningRates() {
    return getApiClient().get("/xero/fetch-earning-rates");
  },
  fetchAccounts() {
    return getApiClient().get("/xero/fetch-accounts");
  },
  fetchPayrollCalendars() {
    return getApiClient().get("/xero/fetch-payroll-calendars");
  },
  pushData(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/xero/push-data", payload);
  },
  pushTimesheet(payload: Record<string, unknown> = {}) {
    return getApiClient().post("/xero/push-timesheet", payload);
  },
};

export const timesheetActivityApi = {
  store(payload: Record<string, unknown>) {
    return getApiClient().post("/timesheet-activity/store", payload);
  },
  list(params: Record<string, unknown> = {}) {
    return getApiClient().get("/timesheet-activity", { params });
  },
  validate(params: Record<string, unknown> = {}) {
    return getApiClient().get("/timesheet-activity/validate", { params });
  },
  sendLocation(payload: Record<string, unknown>) {
    return getApiClient().post("/timesheet-activity/send-location", payload);
  },
};
