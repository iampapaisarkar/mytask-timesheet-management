export const APP_NAME = "myTask";

/** Default page size for all org data tables (first load). */
export const DEFAULT_LIST_PAGE_SIZE = 10;

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
  help: "/help",
  terms: "/terms",
  privacy: "/privacy",
  pricing: "/pricing",
  subscription: "/subscription",
  billingHistory: "/billing",
  billingInvoice: (id: string | number) => `/billing/${id}`,
  billingSuccess: "/billing/success",
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
  payouts: (orgCode: string) => `/org/${orgCode}/payouts`,
  settings: (orgCode: string) => `/org/${orgCode}/settings`,
  systemLogs: (orgCode: string) => `/org/${orgCode}/system-logs`,
  organisationDetails: (orgCode: string) =>
    `/org/${orgCode}/settings/organisation-details`,
  holidayCalendars: (orgCode: string) =>
    `/org/${orgCode}/settings/holiday-calendars`,
  payrollCalendars: (orgCode: string) =>
    `/org/${orgCode}/settings/payroll-calendars`,
  employees: (orgCode: string) => `/org/${orgCode}/employees`,
  customers: (orgCode: string) => `/org/${orgCode}/customers`,
  jobs: (orgCode: string) => `/org/${orgCode}/jobs`,
  notifications: (orgCode: string) => `/org/${orgCode}/notifications`,
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
    key: "payouts",
    label: "Payouts",
    path: "payouts",
    acl: { action: "payout", permission: "list" },
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
  {
    key: "systemLogs",
    label: "System Logs",
    path: "system-logs",
    acl: { action: "systemLog", permission: "list" },
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
  { path: "payouts", acl: { action: "payout", permission: "list" } },
  { path: "settings", acl: { action: "setting", permission: "list" } },
  {
    path: "settings/organisation-details",
    acl: { action: "organisationSetting", permission: "view" },
  },
  {
    path: "settings/holiday-calendars",
    acl: { action: "holidayCalendar", permission: "list" },
  },
  {
    path: "settings/payroll-calendars",
    acl: { action: "payrollCalendar", permission: "list" },
  },
  { path: "employees", acl: { action: "employee", permission: "list" } },
  { path: "customers", acl: { action: "customer", permission: "list" } },
  { path: "jobs", acl: { action: "job", permission: "list" } },
  { path: "system-logs", acl: { action: "systemLog", permission: "list" } },
] as const;

export const TIMESHEET_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
] as const;

/** Supported currencies for employee wages and customer pricing. */
export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
] as const;

export type SupportedCurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

/**
 * Last-resort fallback when country/locale cannot be resolved.
 * Prefer `currencyFromCountryIso` / org `default_currency` instead.
 */
export const DEFAULT_CURRENCY: SupportedCurrencyCode = "USD";

/** ISO 3166-1 alpha-2 → ISO 4217 for supported currencies. */
export const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrencyCode> = {
  US: "USD",
  IN: "INR",
  AU: "AUD",
  GB: "GBP",
  NZ: "NZD",
  CA: "CAD",
  SG: "SGD",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  LU: "EUR",
  GR: "EUR",
};

export function currencyFromCountryIso(
  countryIso: string | null | undefined,
  fallback: SupportedCurrencyCode = DEFAULT_CURRENCY,
): SupportedCurrencyCode {
  if (!countryIso) return fallback;
  const key = countryIso.trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[key] || fallback;
}

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (c) => c.code,
) as readonly SupportedCurrencyCode[];

export function isSupportedCurrency(
  code: string | null | undefined,
): code is SupportedCurrencyCode {
  return Boolean(
    code &&
      SUPPORTED_CURRENCY_CODES.includes(
        code.toUpperCase() as SupportedCurrencyCode,
      ),
  );
}

export function normalizeCurrency(
  code: string | null | undefined,
  fallback: SupportedCurrencyCode = DEFAULT_CURRENCY,
): SupportedCurrencyCode {
  if (!code) return fallback;
  const upper = code.toUpperCase();
  return isSupportedCurrency(upper) ? upper : fallback;
}

/** Display prefix: ₹INR, $USD, $AUD, £GBP, €EUR, … */
export const CURRENCY_DISPLAY_PREFIX: Record<SupportedCurrencyCode, string> = {
  USD: "$USD",
  AUD: "$AUD",
  INR: "₹INR",
  GBP: "£GBP",
  EUR: "€EUR",
  NZD: "$NZD",
  CAD: "$CAD",
  SGD: "$SGD",
};

export function currencyDisplayPrefix(
  code: string | null | undefined,
): string {
  const normalized = normalizeCurrency(code);
  return CURRENCY_DISPLAY_PREFIX[normalized] || `$${normalized}`;
}

/** e.g. `$AUD 120.50`, `₹INR 999.00` */
export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
): string {
  if (amount == null || amount === "") return "—";
  const num = Number(amount);
  if (Number.isNaN(num)) return "—";
  return `${currencyDisplayPrefix(currency)} ${num.toFixed(2)}`;
}

/** e.g. `7.5h`, `0.75h`, `8h` */
export function formatHours(
  hours: number | string | null | undefined,
): string {
  if (hours == null || hours === "") return "—";
  const num = Number(hours);
  if (Number.isNaN(num)) return "—";
  const text = Number.isInteger(num)
    ? String(num)
    : String(Number(num.toFixed(2)));
  return `${text}h`;
}

export {
  APP_WEB_HOST,
  APP_WEB_ORIGIN,
  FAQ_SECTIONS,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
} from "./legalContent";
export type { FaqItem, FaqSection, LegalSection } from "./legalContent";
