import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, OrgAclRoute, ProtectedRoute } from "@/app/guards";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { OrgLayout } from "@/layouts/OrgLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { AuthActionsPage } from "@/features/auth/AuthActionsPage";
import { OrgInvitationPage } from "@/features/invitations";
import { HomePage } from "@/features/home/HomePage";
import { OrganisationHomePage } from "@/features/organisation/OrganisationHomePage";
import { TimesheetListPage } from "@/features/timesheet/TimesheetListPage";
import { TimesheetDetailPage } from "@/features/timesheet/TimesheetDetailPage";
import { TimesheetManagementListPage } from "@/features/timesheet-management/TimesheetManagementListPage";
import { TimesheetManagementDetailPage } from "@/features/timesheet-management/TimesheetManagementDetailPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { JobsPage } from "@/features/jobs/JobsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { OrganisationDetailsPage } from "@/features/settings/OrganisationDetailsPage";
import { RegionsPage } from "@/features/settings/RegionsPage";
import { HolidayCalendarsPage } from "@/features/settings/HolidayCalendarsPage";
import { PayrollCalendarsPage } from "@/features/settings/PayrollCalendarsPage";
import { EarningRatesPage } from "@/features/settings/EarningRatesPage";
import { EarningRateRulesPage } from "@/features/settings/EarningRateRulesPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { CreateOrganisationPage } from "@/features/organisation/CreateOrganisationPage";
import { ReportsPage } from "@/features/reports/ReportsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth action links must stay public even with an existing session */}
        <Route element={<AuthLayout />}>
          <Route path="/auth-actions" element={<AuthActionsPage />} />
          <Route path="/org-invitation" element={<OrgInvitationPage />} />
        </Route>

        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/organisations/create"
              element={<CreateOrganisationPage />}
            />
          </Route>

          <Route path="/org/:orgCode" element={<OrgLayout />}>
            <Route index element={<OrganisationHomePage />} />

            <Route
              element={
                <OrgAclRoute acl={{ action: "timesheet", permission: "list" }} />
              }
            >
              <Route path="timesheet" element={<TimesheetListPage />} />
            </Route>
            <Route
              element={
                <OrgAclRoute acl={{ action: "timesheet", permission: "view" }} />
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
                  acl={{ action: "timesheetManagement", permission: "list" }}
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
                  acl={{ action: "timesheetManagement", permission: "view" }}
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
                <OrgAclRoute acl={{ action: "report", permission: "view" }} />
              }
            >
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route
              element={
                <OrgAclRoute acl={{ action: "setting", permission: "list" }} />
              }
            >
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route
              element={
                <OrgAclRoute
                  acl={{ action: "organisationSetting", permission: "view" }}
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
                <OrgAclRoute acl={{ action: "region", permission: "list" }} />
              }
            >
              <Route path="settings/regions" element={<RegionsPage />} />
            </Route>
            <Route
              element={
                <OrgAclRoute
                  acl={{ action: "holidayCalendar", permission: "list" }}
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
                  acl={{ action: "payrollCalendar", permission: "list" }}
                />
              }
            >
              <Route
                path="settings/payroll-calendars"
                element={<PayrollCalendarsPage />}
              />
            </Route>
            <Route
              element={
                <OrgAclRoute
                  acl={{ action: "earningRate", permission: "list" }}
                />
              }
            >
              <Route
                path="settings/earning-rates"
                element={<EarningRatesPage />}
              />
            </Route>
            <Route
              element={
                <OrgAclRoute
                  acl={{ action: "awardRate", permission: "list" }}
                />
              }
            >
              <Route
                path="settings/earning-rate-rules"
                element={<EarningRateRulesPage />}
              />
            </Route>

            <Route
              element={
                <OrgAclRoute acl={{ action: "employee", permission: "list" }} />
              }
            >
              <Route path="employees" element={<EmployeesPage />} />
            </Route>
            <Route
              element={
                <OrgAclRoute acl={{ action: "customer", permission: "list" }} />
              }
            >
              <Route path="customers" element={<CustomersPage />} />
            </Route>
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
    </BrowserRouter>
  );
}
