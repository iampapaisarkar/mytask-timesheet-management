export const APP_NAME = "mySheet";

export const ORG_HEADERS = {
  id: "ms-organisation-id",
  code: "ms-organisation-code",
  name: "ms-organisation-name",
} as const;

export const STORAGE_KEYS = {
  authToken: "mysheet.authToken",
  user: "mysheet.user",
  organisation: "mysheet.organisation",
  fcmToken: "mysheet.fcmToken",
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
  managementGroup: (orgCode: string) => `/org/${orgCode}/management-group`,
  jobs: (orgCode: string) => `/org/${orgCode}/jobs`,
  xeroAuthenticate: "/xero/authenticate",
} as const;

export const ORG_NAV = [
  { key: "home", label: "Home", path: "", acl: null },
  {
    key: "timesheet",
    label: "My Timesheets",
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
    key: "managementGroup",
    label: "Management Group",
    path: "management-group",
    acl: { action: "managementGroup", permission: "list" },
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

export const TIMESHEET_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
] as const;
