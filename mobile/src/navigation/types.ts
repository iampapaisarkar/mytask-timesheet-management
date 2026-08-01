import type { NavigatorScreenParams } from "@react-navigation/native";

/** Day editor shared across Sheets + Manage stacks. */
export type TimesheetDayParams = {
  orgCode: string;
  timesheetId: string;
  dayId: string;
  mode?: "self" | "management";
  employeeId?: string;
};

export type DashboardStackParamList = {
  OrgDashboard: { orgCode: string };
};

export type SheetsStackParamList = {
  TimesheetList: { orgCode: string };
  TimesheetDetail: { orgCode: string; id: string };
  TimesheetDayDetail: TimesheetDayParams;
};

export type ManageStackParamList = {
  TimesheetManagementList: { orgCode: string };
  TimesheetManagementDetail: { orgCode: string; id: string };
  TimesheetDayDetail: TimesheetDayParams;
};

export type MoreStackParamList = {
  MoreHome: { orgCode: string };
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

export type OrgTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Sheets: NavigatorScreenParams<SheetsStackParamList>;
  Manage: NavigatorScreenParams<ManageStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};

export type RootStackParamList = {
  Login: { invitationToken?: string } | undefined;
  Signup: { invitationToken?: string } | undefined;
  ForgotPassword: undefined;
  OrgInvitation: { token: string };
  Home: undefined;
  Profile: undefined;
  CreateOrganisation: undefined;
  /** Org shell — pass `orgCode`; optionally nest into a tab via `screen` / `params`. */
  Organisation: {
    orgCode: string;
    screen?: keyof OrgTabParamList;
    params?: object;
    merge?: boolean;
    initial?: boolean;
  };
  NotificationsList: { orgCode: string };
  Legal: { kind: "help" | "terms" | "privacy" };
  Pricing: undefined;
  Subscription: undefined;
  BillingHistory: undefined;
};
