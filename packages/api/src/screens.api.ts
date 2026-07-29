import { getApiClient, type RequestOptions } from "./client";
import type {
  ApiResponse,
  DashboardOverviewView,
  EmployeeFormLookupsView,
  HomeBootstrapView,
  OrgBootstrapView,
  TimesheetDayEditorView,
} from "@mytask/types";

export const screensApi = {
  orgBootstrap(orgCode: string, options?: RequestOptions) {
    return getApiClient().get<ApiResponse<OrgBootstrapView>>(
      "/screens/org-bootstrap",
      {
        params: { org_code: orgCode },
        signal: options?.signal,
        timeout: options?.timeout,
      },
    );
  },

  home(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<HomeBootstrapView>>("/screens/home", {
      signal: options?.signal,
      timeout: options?.timeout,
    });
  },

  employeeForm(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<EmployeeFormLookupsView>>(
      "/screens/employee-form",
      {
        signal: options?.signal,
        timeout: options?.timeout,
      },
    );
  },

  timesheetDayEditor(
    params: {
      mode: "self" | "management";
      timesheet_day_id: string | number;
      employee_id?: string | number;
    },
    options?: RequestOptions,
  ) {
    return getApiClient().get<ApiResponse<TimesheetDayEditorView>>(
      "/screens/timesheet-day-editor",
      {
        params,
        signal: options?.signal,
        timeout: options?.timeout,
      },
    );
  },

  dashboard(options?: RequestOptions) {
    return getApiClient().get<ApiResponse<DashboardOverviewView>>(
      "/screens/dashboard",
      {
        signal: options?.signal,
        timeout: options?.timeout,
      },
    );
  },
};
