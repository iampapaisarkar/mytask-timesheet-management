import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, OrgAclRoute, ProtectedRoute } from "@/app/guards";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { WebPushProvider } from "@/providers/WebPushProvider";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { OrgLayout } from "@/layouts/OrgLayout";
import { PublicContentLayout } from "@/layouts/PublicContentLayout";
import { LoadingState } from "@/components/ui/States";

/** Route-level code splitting — auth shell stays eager for fast first paint. */
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/features/auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const AuthActionsPage = lazy(() =>
  import("@/features/auth/AuthActionsPage").then((m) => ({
    default: m.AuthActionsPage,
  })),
);
const OrgInvitationPage = lazy(() =>
  import("@/features/invitations").then((m) => ({
    default: m.OrgInvitationPage,
  })),
);
const HomePage = lazy(() =>
  import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })),
);
const OrganisationHomePage = lazy(() =>
  import("@/features/organisation/OrganisationHomePage").then((m) => ({
    default: m.OrganisationHomePage,
  })),
);
const CreateOrganisationPage = lazy(() =>
  import("@/features/organisation/CreateOrganisationPage").then((m) => ({
    default: m.CreateOrganisationPage,
  })),
);
const TimesheetListPage = lazy(() =>
  import("@/features/timesheet/TimesheetListPage").then((m) => ({
    default: m.TimesheetListPage,
  })),
);
const TimesheetDetailPage = lazy(() =>
  import("@/features/timesheet/TimesheetDetailPage").then((m) => ({
    default: m.TimesheetDetailPage,
  })),
);
const TimesheetManagementListPage = lazy(() =>
  import("@/features/timesheet-management/TimesheetManagementListPage").then(
    (m) => ({ default: m.TimesheetManagementListPage }),
  ),
);
const TimesheetManagementDetailPage = lazy(() =>
  import("@/features/timesheet-management/TimesheetManagementDetailPage").then(
    (m) => ({ default: m.TimesheetManagementDetailPage }),
  ),
);
const EmployeesPage = lazy(() =>
  import("@/features/employees/EmployeesPage").then((m) => ({
    default: m.EmployeesPage,
  })),
);
const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage").then((m) => ({
    default: m.CustomersPage,
  })),
);
const JobsPage = lazy(() =>
  import("@/features/jobs/JobsPage").then((m) => ({ default: m.JobsPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const OrganisationDetailsPage = lazy(() =>
  import("@/features/settings/OrganisationDetailsPage").then((m) => ({
    default: m.OrganisationDetailsPage,
  })),
);
const HolidayCalendarsPage = lazy(() =>
  import("@/features/settings/HolidayCalendarsPage").then((m) => ({
    default: m.HolidayCalendarsPage,
  })),
);
const PayrollCalendarsPage = lazy(() =>
  import("@/features/settings/PayrollCalendarsPage").then((m) => ({
    default: m.PayrollCalendarsPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/features/reports/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
const PayoutsPage = lazy(() =>
  import("@/features/payouts/PayoutsPage").then((m) => ({
    default: m.PayoutsPage,
  })),
);
const SystemLogsPage = lazy(() =>
  import("@/features/system-logs/SystemLogsPage").then((m) => ({
    default: m.SystemLogsPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const HelpFaqPage = lazy(() =>
  import("@/features/legal").then((m) => ({ default: m.HelpFaqPage })),
);
const PrivacyPage = lazy(() =>
  import("@/features/legal").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/features/legal").then((m) => ({ default: m.TermsPage })),
);
const PricingPage = lazy(() =>
  import("@/features/billing").then((m) => ({ default: m.PricingPage })),
);
const SubscriptionPage = lazy(() =>
  import("@/features/billing").then((m) => ({ default: m.SubscriptionPage })),
);
const BillingHistoryPage = lazy(() =>
  import("@/features/billing").then((m) => ({ default: m.BillingHistoryPage })),
);
const BillingSuccessPage = lazy(() =>
  import("@/features/billing").then((m) => ({ default: m.BillingSuccessPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <LoadingState label="Loading…" />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <WebPushProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/auth-actions" element={<AuthActionsPage />} />
                <Route path="/org-invitation" element={<OrgInvitationPage />} />
              </Route>

              <Route element={<PublicContentLayout />}>
                <Route path="/help" element={<HelpFaqPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Route>

              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                  />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="/billing" element={<BillingHistoryPage />} />
                  <Route
                    path="/billing/success"
                    element={<BillingSuccessPage />}
                  />
                  <Route
                    path="/organisations/create"
                    element={<CreateOrganisationPage />}
                  />
                </Route>

                <Route path="/org/:orgCode" element={<OrgLayout />}>
                  <Route index element={<OrganisationHomePage />} />

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "timesheet", permission: "list" }}
                      />
                    }
                  >
                    <Route path="timesheet" element={<TimesheetListPage />} />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "timesheet", permission: "view" }}
                      />
                    }
                  >
                    <Route
                      path="timesheet/:id/details"
                      element={<TimesheetDetailPage />}
                    />
                  </Route>

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{
                          action: "timesheetManagement",
                          permission: "list",
                        }}
                      />
                    }
                  >
                    <Route
                      path="timesheet-management"
                      element={<TimesheetManagementListPage />}
                    />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{
                          action: "timesheetManagement",
                          permission: "view",
                        }}
                      />
                    }
                  >
                    <Route
                      path="timesheet-management/:id/details"
                      element={<TimesheetManagementDetailPage />}
                    />
                  </Route>

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "report", permission: "view" }}
                      />
                    }
                  >
                    <Route path="reports" element={<ReportsPage />} />
                  </Route>

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "payout", permission: "list" }}
                      />
                    }
                  >
                    <Route path="payouts" element={<PayoutsPage />} />
                  </Route>

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "systemLog", permission: "list" }}
                      />
                    }
                  >
                    <Route path="system-logs" element={<SystemLogsPage />} />
                  </Route>

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "setting", permission: "list" }}
                      />
                    }
                  >
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{
                          action: "organisationSetting",
                          permission: "view",
                        }}
                      />
                    }
                  >
                    <Route
                      path="settings/organisation-details"
                      element={<OrganisationDetailsPage />}
                    />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{
                          action: "holidayCalendar",
                          permission: "list",
                        }}
                      />
                    }
                  >
                    <Route
                      path="settings/holiday-calendars"
                      element={<HolidayCalendarsPage />}
                    />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{
                          action: "payrollCalendar",
                          permission: "list",
                        }}
                      />
                    }
                  >
                    <Route
                      path="settings/payroll-calendars"
                      element={<PayrollCalendarsPage />}
                    />
                  </Route>
                  <Route path="settings/help" element={<HelpFaqPage />} />
                  <Route path="settings/terms" element={<TermsPage />} />
                  <Route path="settings/privacy" element={<PrivacyPage />} />

                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "employee", permission: "list" }}
                      />
                    }
                  >
                    <Route path="employees" element={<EmployeesPage />} />
                  </Route>
                  <Route
                    element={
                      <OrgAclRoute
                        acl={{ action: "customer", permission: "list" }}
                      />
                    }
                  >
                    <Route path="customers" element={<CustomersPage />} />
                  </Route>
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route
                    element={
                      <OrgAclRoute acl={{ action: "job", permission: "list" }} />
                    }
                  >
                    <Route path="jobs" element={<JobsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </WebPushProvider>
      </RealtimeProvider>
    </BrowserRouter>
  );
}
