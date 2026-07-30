import type { AxiosRequestConfig } from "axios";
import { getApiClient, type RequestOptions } from "./client";
import { buildListQuery } from "@mytask/utils";
import type { ApiResponse, ListParams } from "@mytask/types";

/** Optional AbortSignal / timeout without changing endpoint URLs. */
function req(
  options?: RequestOptions,
  params?: Record<string, unknown>,
): AxiosRequestConfig {
  const mergedParams =
    params || options?.params
      ? { ...params, ...options?.params }
      : undefined;
  return {
    ...(mergedParams ? { params: mergedParams } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.timeout != null ? { timeout: options.timeout } : {}),
    ...(options?.headers ? { headers: options.headers } : {}),
  };
}

function resourceApi(base: string) {
  return {
    list(params: ListParams = {}, options?: RequestOptions) {
      return getApiClient().get<ApiResponse<unknown[]>>(`${base}/list`, {
        ...req(options, buildListQuery(params)),
      });
    },
    create(payload: Record<string, unknown>, options?: RequestOptions) {
      return getApiClient().post<ApiResponse<unknown>>(
        `${base}/create`,
        payload,
        req(options),
      );
    },
    update(
      id: string | number,
      payload: Record<string, unknown>,
      options?: RequestOptions,
    ) {
      return getApiClient().post<ApiResponse<unknown>>(
        `${base}/${id}/update`,
        payload,
        req(options),
      );
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
export const holidayCalendarsApi = resourceApi("/holiday-calendars");
export const earningRatesApi = resourceApi("/earning-rates");
export const awardRatesApi = resourceApi("/award-rates");

export const payrollCalendarsApi = {
  list(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get("/payroll-calendars/list", {
      ...req(options, buildListQuery(params)),
    });
  },
  create(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post(
      "/payroll-calendars/create",
      payload,
      req(options),
    );
  },
};

export const timesheetsApi = {
  list(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get("/timesheets/list", {
      ...req(options, buildListQuery(params)),
    });
  },
  get(
    id: string | number,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().get(`/timesheets/${id}/get`, req(options, params));
  },
  getDay(
    id: string | number,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().get(`/timesheets/${id}/get-day`, req(options, params));
  },
  save(
    id: string | number,
    payload: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().post(`/timesheets/${id}/save`, payload, req(options));
  },
  submitForApproval(
    id: string | number,
    payload: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheets/${id}/submit-for-approval`,
      payload,
      req(options),
    );
  },
};

export const timesheetManagementApi = {
  list(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get("/timesheet-management/list", {
      ...req(options, buildListQuery(params)),
    });
  },
  get(id: string | number, options?: RequestOptions) {
    return getApiClient().get(`/timesheet-management/${id}/get`, req(options));
  },
  getDay(
    id: string | number,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().get(
      `/timesheet-management/${id}/get-day`,
      req(options, params),
    );
  },
  create(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post(
      "/timesheet-management/create",
      payload,
      req(options),
    );
  },
  save(
    id: string | number,
    payload: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheet-management/${id}/save`,
      payload,
      req(options),
    );
  },
  submitForApproval(
    id: string | number,
    payload: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheet-management/${id}/submit-for-approval`,
      payload,
      req(options),
    );
  },
  approve(
    id: string | number,
    payload: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheet-management/${id}/approve`,
      payload,
      req(options),
    );
  },
  reject(
    id: string | number,
    payload: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheet-management/${id}/reject`,
      payload,
      req(options),
    );
  },
  revert(
    id: string | number,
    payload: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().post(
      `/timesheet-management/${id}/revert`,
      payload,
      req(options),
    );
  },
  employeePayrollCycles(employeeId: string | number, options?: RequestOptions) {
    return getApiClient().get(
      `/timesheet-management/${employeeId}/employee-payroll-cycles`,
      req(options),
    );
  },
};

export const systemApi = {
  get(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ) {
    return getApiClient().get(`/system/${path}`, req(options, params));
  },
};

export const notificationsApi = {
  list(params: ListParams = {}, options?: RequestOptions) {
    return getApiClient().get("/notifications/list", {
      ...req(options, buildListQuery(params)),
    });
  },
  /** Backend reads status code from query `type` (e.g. `read`). */
  markAs(id: string | number, type = "read", options?: RequestOptions) {
    return getApiClient().post(`/notifications/${id}/mark-as`, {}, {
      ...req(options),
      params: { type, ...options?.params },
    });
  },
  markAllAs(type = "read", options?: RequestOptions) {
    return getApiClient().post("/notifications/mark-all-as", {}, {
      ...req(options),
      params: { type, ...options?.params },
    });
  },
};

export const reportsApi = {
  rateByPerTimesheetDay(
    params: Record<string, unknown> = {},
    options?: RequestOptions,
  ) {
    return getApiClient().get(
      "/reports/rate-by-per-timesheet-day",
      req(options, params),
    );
  },
};

export const timesheetActivityApi = {
  store(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post(
      "/timesheet-activity/store",
      payload,
      req(options),
    );
  },
  list(params: Record<string, unknown> = {}, options?: RequestOptions) {
    return getApiClient().get("/timesheet-activity", req(options, params));
  },
  validate(params: Record<string, unknown> = {}, options?: RequestOptions) {
    return getApiClient().get(
      "/timesheet-activity/validate",
      req(options, params),
    );
  },
  sendLocation(payload: Record<string, unknown>, options?: RequestOptions) {
    return getApiClient().post(
      "/timesheet-activity/send-location",
      payload,
      req(options),
    );
  },
};
