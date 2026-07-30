export const APP_NAME = "myTask";

export const ORG_HEADERS = {
  id: "ms-organisation-id",
  code: "ms-organisation-code",
  name: "ms-organisation-name",
} as const;

export const STORAGE_KEYS = {
  authToken: "mytask.authToken",
  user: "mytask.user",
  organisation: "mytask.organisation",
  fcmToken: "mytask.fcmToken",
} as const;

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  authActions: "/auth-actions",
  orgInvitation: "/org-invitation",
  home: "/",
  profile: "/profile",
  createOrganisation: "/organisations/create",
  org: (orgCode: string) => `/org/${orgCode}`,
  orgHome: (orgCode: string) => `/org/${orgCode}`,
  timesheet: (orgCode: string) => `/org/${orgCode}/timesheet`,
  timesheetDetails: (orgCode: string, id: string | number) =>
    `/org/${orgCode}/timesheet/${id}/details`,
  timesheetManagement: (orgCode: string) =>
    `/org/${orgCode}/timesheet-management`,
  timesheetManagementDetails: (orgCode: string, id: string | number) =>
    `/org/${orgCode}/timesheet-management/${id}/details`,
  reports: (orgCode: string) => `/org/${orgCode}/reports`,
  settings: (orgCode: string) => `/org/${orgCode}/settings`,
  organisationDetails: (orgCode: string) =>
    `/org/${orgCode}/settings/organisation-details`,
  regions: (orgCode: string) => `/org/${orgCode}/settings/regions`,
  holidayCalendars: (orgCode: string) =>
    `/org/${orgCode}/settings/holiday-calendars`,
  payrollCalendars: (orgCode: string) =>
    `/org/${orgCode}/settings/payroll-calendars`,
  earningRates: (orgCode: string) =>
    `/org/${orgCode}/settings/earning-rates`,
  earningRateRules: (orgCode: string) =>
    `/org/${orgCode}/settings/earning-rate-rules`,
  employees: (orgCode: string) => `/org/${orgCode}/employees`,
  customers: (orgCode: string) => `/org/${orgCode}/customers`,
  jobs: (orgCode: string) => `/org/${orgCode}/jobs`,
  xeroAuthenticate: "/xero/authenticate",
} as const;

export const ORG_NAV = [
  { key: "home", label: "Home", path: "", acl: null },
  {
    key: "timesheet",
    label: "My Sheets",
    path: "timesheet",
    acl: { action: "timesheet", permission: "list" },
  },
  {
    key: "timesheetManagement",
    label: "Timesheets",
    path: "timesheet-management",
    acl: { action: "timesheetManagement", permission: "list" },
  },
  {
    key: "reports",
    label: "Reports",
    path: "reports",
    acl: { action: "report", permission: "view" },
  },
  {
    key: "employees",
    label: "Employees",
    path: "employees",
    acl: { action: "employee", permission: "list" },
  },
  {
    key: "customers",
    label: "Customers",
    path: "customers",
    acl: { action: "customer", permission: "list" },
  },
  {
    key: "jobs",
    label: "Jobs",
    path: "jobs",
    acl: { action: "job", permission: "list" },
  },
  {
    key: "settings",
    label: "Settings",
    path: "settings",
    acl: { action: "setting", permission: "list" },
  },
] as const;

/**
 * Route-level ACL for org child paths (relative to `/org/:orgCode`).
 * Mirrors Vue `meta.acl` / ROUTE_ANALYSIS.md.
 */
export const ORG_ROUTE_ACL = [
  { path: "timesheet", acl: { action: "timesheet", permission: "list" } },
  {
    path: "timesheet/:id/details",
    acl: { action: "timesheet", permission: "view" },
  },
  {
    path: "timesheet-management",
    acl: { action: "timesheetManagement", permission: "list" },
  },
  {
    path: "timesheet-management/:id/details",
    acl: { action: "timesheetManagement", permission: "view" },
  },
  { path: "reports", acl: { action: "report", permission: "view" } },
  { path: "settings", acl: { action: "setting", permission: "list" } },
  {
    path: "settings/organisation-details",
    acl: { action: "organisationSetting", permission: "view" },
  },
  { path: "settings/regions", acl: { action: "region", permission: "list" } },
  {
    path: "settings/holiday-calendars",
    acl: { action: "holidayCalendar", permission: "list" },
  },
  {
    path: "settings/payroll-calendars",
    acl: { action: "payrollCalendar", permission: "list" },
  },
  {
    path: "settings/earning-rates",
    acl: { action: "earningRate", permission: "list" },
  },
  {
    path: "settings/earning-rate-rules",
    acl: { action: "awardRate", permission: "list" },
  },
  { path: "employees", acl: { action: "employee", permission: "list" } },
  { path: "customers", acl: { action: "customer", permission: "list" } },
  { path: "jobs", acl: { action: "job", permission: "list" } },
] as const;

export const TIMESHEET_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
] as const;
