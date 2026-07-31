import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, OrgAclRoute, ProtectedRoute } from "@/app/guards";
import {
  AuthActionsPage,
  BillingHistoryPage,
  BillingSuccessPage,
  CreateOrganisationPage,
  CustomersPage,
  EmployeesPage,
  ForgotPasswordPage,
  HelpFaqPage,
  HolidayCalendarsPage,
  HomePage,
  JobsPage,
  LoginPage,
  NotificationsPage,
  OrganisationDetailsPage,
  OrganisationHomePage,
  OrgInvitationPage,
  PayrollCalendarsPage,
  PayoutsPage,
  PricingPage,
  PrivacyPage,
  ProfilePage,
  ReportsPage,
  scheduleIdleRoutePrefetch,
  SettingsPage,
  SignupPage,
  SubscriptionPage,
  SystemLogsPage,
  TermsPage,
  TimesheetDetailPage,
  TimesheetListPage,
  TimesheetManagementDetailPage,
  TimesheetManagementListPage,
} from "@/app/routeModules";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { WebPushProvider } from "@/providers/WebPushProvider";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { OrgLayout } from "@/layouts/OrgLayout";
import { PublicContentLayout } from "@/layouts/PublicContentLayout";
import { LoadingState } from "@/components/ui/States";
import { useAuthStore } from "@/store/authStore";

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <LoadingState label="Loading…" />
    </div>
  );
}

function IdleRoutePrefetch() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !token) return;
    scheduleIdleRoutePrefetch();
  }, [hydrated, token]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <WebPushProvider>
          <IdleRoutePrefetch />
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
