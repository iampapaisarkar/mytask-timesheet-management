import { lazyRoute } from "@/app/lazyRoute";

/** Shared lazy page modules — used by AppRouter + prefetch helpers. */

export const LoginPage = lazyRoute(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
export const SignupPage = lazyRoute(() =>
  import("@/features/auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);
export const ForgotPasswordPage = lazyRoute(() =>
  import("@/features/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
export const AuthActionsPage = lazyRoute(() =>
  import("@/features/auth/AuthActionsPage").then((m) => ({
    default: m.AuthActionsPage,
  })),
);
export const OrgInvitationPage = lazyRoute(() =>
  import("@/features/invitations").then((m) => ({
    default: m.OrgInvitationPage,
  })),
);
export const HomePage = lazyRoute(() =>
  import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })),
);
export const OrganisationHomePage = lazyRoute(() =>
  import("@/features/organisation/OrganisationHomePage").then((m) => ({
    default: m.OrganisationHomePage,
  })),
);
export const CreateOrganisationPage = lazyRoute(() =>
  import("@/features/organisation/CreateOrganisationPage").then((m) => ({
    default: m.CreateOrganisationPage,
  })),
);
export const TimesheetListPage = lazyRoute(() =>
  import("@/features/timesheet/TimesheetListPage").then((m) => ({
    default: m.TimesheetListPage,
  })),
);
export const TimesheetDetailPage = lazyRoute(() =>
  import("@/features/timesheet/TimesheetDetailPage").then((m) => ({
    default: m.TimesheetDetailPage,
  })),
);
export const TimesheetManagementListPage = lazyRoute(() =>
  import("@/features/timesheet-management/TimesheetManagementListPage").then(
    (m) => ({ default: m.TimesheetManagementListPage }),
  ),
);
export const TimesheetManagementDetailPage = lazyRoute(() =>
  import("@/features/timesheet-management/TimesheetManagementDetailPage").then(
    (m) => ({ default: m.TimesheetManagementDetailPage }),
  ),
);
export const EmployeesPage = lazyRoute(() =>
  import("@/features/employees/EmployeesPage").then((m) => ({
    default: m.EmployeesPage,
  })),
);
export const CustomersPage = lazyRoute(() =>
  import("@/features/customers/CustomersPage").then((m) => ({
    default: m.CustomersPage,
  })),
);
export const JobsPage = lazyRoute(() =>
  import("@/features/jobs/JobsPage").then((m) => ({ default: m.JobsPage })),
);
export const SettingsPage = lazyRoute(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
export const OrganisationDetailsPage = lazyRoute(() =>
  import("@/features/settings/OrganisationDetailsPage").then((m) => ({
    default: m.OrganisationDetailsPage,
  })),
);
export const HolidayCalendarsPage = lazyRoute(() =>
  import("@/features/settings/HolidayCalendarsPage").then((m) => ({
    default: m.HolidayCalendarsPage,
  })),
);
export const PayrollCalendarsPage = lazyRoute(() =>
  import("@/features/settings/PayrollCalendarsPage").then((m) => ({
    default: m.PayrollCalendarsPage,
  })),
);
export const ProfilePage = lazyRoute(() =>
  import("@/features/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);
export const ReportsPage = lazyRoute(() =>
  import("@/features/reports/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
export const PayoutsPage = lazyRoute(() =>
  import("@/features/payouts/PayoutsPage").then((m) => ({
    default: m.PayoutsPage,
  })),
);
export const SystemLogsPage = lazyRoute(() =>
  import("@/features/system-logs/SystemLogsPage").then((m) => ({
    default: m.SystemLogsPage,
  })),
);
export const NotificationsPage = lazyRoute(() =>
  import("@/features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
export const HelpFaqPage = lazyRoute(() =>
  import("@/features/legal").then((m) => ({ default: m.HelpFaqPage })),
);
export const PrivacyPage = lazyRoute(() =>
  import("@/features/legal").then((m) => ({ default: m.PrivacyPage })),
);
export const TermsPage = lazyRoute(() =>
  import("@/features/legal").then((m) => ({ default: m.TermsPage })),
);
export const PricingPage = lazyRoute(() =>
  import("@/features/billing").then((m) => ({ default: m.PricingPage })),
);
export const SubscriptionPage = lazyRoute(() =>
  import("@/features/billing").then((m) => ({ default: m.SubscriptionPage })),
);
export const BillingHistoryPage = lazyRoute(() =>
  import("@/features/billing").then((m) => ({ default: m.BillingHistoryPage })),
);
export const BillingSuccessPage = lazyRoute(() =>
  import("@/features/billing").then((m) => ({ default: m.BillingSuccessPage })),
);

/** ORG_NAV `key` → chunk preload */
export const ORG_NAV_PRELOAD: Record<string, () => Promise<unknown>> = {
  home: () => OrganisationHomePage.preload(),
  timesheet: () => TimesheetListPage.preload(),
  timesheetManagement: () => TimesheetManagementListPage.preload(),
  reports: () => ReportsPage.preload(),
  payouts: () => PayoutsPage.preload(),
  employees: () => EmployeesPage.preload(),
  customers: () => CustomersPage.preload(),
  jobs: () => JobsPage.preload(),
  settings: () => SettingsPage.preload(),
  systemLogs: () => SystemLogsPage.preload(),
};

export function preloadOrgNavKey(key: string): void {
  void ORG_NAV_PRELOAD[key]?.();
}

/** Warm high-traffic chunks after auth without blocking first paint. */
export function scheduleIdleRoutePrefetch(keys: string[] = []): void {
  const run = () => {
    void HomePage.preload();
    void ProfilePage.preload();
    void OrganisationHomePage.preload();
    void TimesheetListPage.preload();
    void TimesheetManagementListPage.preload();
    void NotificationsPage.preload();
    for (const key of keys) {
      preloadOrgNavKey(key);
    }
  };

  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
    }
  ).requestIdleCallback;

  if (typeof ric === "function") {
    ric(() => run(), { timeout: 2500 });
    return;
  }
  globalThis.setTimeout(run, 800);
}
