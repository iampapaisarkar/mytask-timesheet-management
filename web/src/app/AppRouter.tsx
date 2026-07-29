import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute } from "@/app/guards";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { OrgLayout } from "@/layouts/OrgLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { HomePage } from "@/features/home/HomePage";
import { OrganisationHomePage } from "@/features/organisation/OrganisationHomePage";
import { TimesheetListPage } from "@/features/timesheet/TimesheetListPage";
import { TimesheetManagementListPage } from "@/features/timesheet-management/TimesheetManagementListPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { JobsPage } from "@/features/jobs/JobsPage";
import { ManagementGroupsPage } from "@/features/management-groups/ManagementGroupsPage";
import { SettingsPage, PlaceholderPage } from "@/features/settings/SettingsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/auth-actions"
              element={<PlaceholderPage title="Auth Actions" />}
            />
            <Route
              path="/org-invitation"
              element={<PlaceholderPage title="Organisation Invitation" />}
            />
            <Route
              path="/xero/authenticate"
              element={<PlaceholderPage title="Xero Authenticate" />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="/org/:orgCode" element={<OrgLayout />}>
            <Route index element={<OrganisationHomePage />} />
            <Route path="timesheet" element={<TimesheetListPage />} />
            <Route
              path="timesheet/:id/details"
              element={<PlaceholderPage title="Timesheet Details" />}
            />
            <Route
              path="timesheet-management"
              element={<TimesheetManagementListPage />}
            />
            <Route
              path="timesheet-management/:id/details"
              element={<PlaceholderPage title="Timesheet Management Details" />}
            />
            <Route path="reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="settings/organisation-details"
              element={<PlaceholderPage title="Organisation Details" />}
            />
            <Route
              path="settings/regions"
              element={<PlaceholderPage title="Regions" />}
            />
            <Route
              path="settings/holiday-calendars"
              element={<PlaceholderPage title="Holiday Calendars" />}
            />
            <Route
              path="settings/payroll-calendars"
              element={<PlaceholderPage title="Payroll Calendars" />}
            />
            <Route
              path="settings/earning-rates"
              element={<PlaceholderPage title="Earning Rates" />}
            />
            <Route
              path="settings/earning-rate-rules"
              element={<PlaceholderPage title="Earning Rate Rules" />}
            />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="management-group" element={<ManagementGroupsPage />} />
            <Route path="jobs" element={<JobsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
