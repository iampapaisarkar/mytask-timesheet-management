import type { NavigatorScreenParams } from "@react-navigation/native";

/** Day editor shared across Sheets + Manage entry points. */
export type TimesheetDayParams = {
  orgCode: string;
  timesheetId: string;
  dayId: string;
  mode?: "self" | "management";
  employeeId?: string;
  /** Display label for the standalone header (e.g. TS-000123). */
  timesheetCode?: string;
};

/** Period detail (all days) — Sheets or Manage. */
export type TimesheetPeriodParams = {
  orgCode: string;
  id: string;
  /** Display label for the standalone header (e.g. TS-000123). */
  timesheetCode?: string;
};

export type DashboardStackParamList = {
  OrgDashboard: { orgCode: string };
};

/** Sheets tab — list only; period + day editors are org-level. */
export type SheetsStackParamList = {
  TimesheetList: { orgCode: string };
};

/** Manage tab — list only; period + day editors are org-level. */
export type ManageStackParamList = {
  TimesheetManagementList: { orgCode: string };
};

/** More tab — hub only; destinations live on OrgStack. */
export type MoreStackParamList = {
  MoreHome: { orgCode: string };
};

export type OrgTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Sheets: NavigatorScreenParams<SheetsStackParamList>;
  Manage: NavigatorScreenParams<ManageStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};

/**
 * Organisation root stack: tabs sit under OrgTabs; detail destinations are
 * siblings so OrgHeader + bottom tabs are naturally hidden.
 */
export type OrgStackParamList = {
  OrgTabs: NavigatorScreenParams<OrgTabParamList> | undefined;
  TimesheetDetail: TimesheetPeriodParams;
  TimesheetManagementDetail: TimesheetPeriodParams;
  TimesheetDayDetail: TimesheetDayParams;
  EmployeesList: { orgCode: string };
  CustomersList: { orgCode: string };
  JobsList: { orgCode: string };
  Reports: { orgCode: string };
  Payouts: { orgCode: string };
  PayoutDetail: { orgCode: string; id: string };
  SystemLogs: { orgCode: string };
  SettingsHub: { orgCode: string };
  OrganisationDetails: { orgCode: string };
  HolidayCalendars: { orgCode: string };
  PayrollCalendars: { orgCode: string };
};

export type RootStackParamList = {
  Login: { invitationToken?: string } | undefined;
  Signup: { invitationToken?: string } | undefined;
  ForgotPassword: undefined;
  OrgInvitation: { token: string };
  Home: undefined;
  Profile: undefined;
  CreateOrganisation: undefined;
  /** Org shell — pass `orgCode`; optionally nest into OrgStack via `screen` / `params`. */
  Organisation: {
    orgCode: string;
    screen?: keyof OrgStackParamList;
    params?: object;
    merge?: boolean;
    initial?: boolean;
  };
  NotificationsList: { orgCode: string };
  Legal: { kind: "help" | "terms" | "privacy" };
  Pricing: undefined;
  Subscription: undefined;
  BillingHistory: undefined;
  BillingInvoice: { id: string };
};
