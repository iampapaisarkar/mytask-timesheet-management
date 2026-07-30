# Route Analysis

Recovered from `index-CCUdSRjz.js` Vue Router config.

## Public / auth

| Path | Name | Layout | Notes |
|------|------|--------|-------|
| `/login` | Login | AuthLayout | |
| `/signup` | Signup | AuthLayout | |
| `/forgot-password` | Forgot Password | AuthLayout | |
| `/auth-actions` | Auth Actions | AuthLayout | Firebase email action handler |
| `/org-invitation` | Signup & Accept Invitation | AuthLayout | |

## Authenticated (MainLayout)

| Path | Name | Guards |
|------|------|--------|
| `/` | Home | `requiresAuth` |
| `/profile` | Profile | `requiresAuth` |

## Organisation (`/org/:orgCode` — OrgLayout)

Requires `requiresAuth` + `requiresOrganisation`.

| Child path | Name | ACL |
|------------|------|-----|
| `` (index) | Organisation Home | — |
| `timesheet` | Timesheet | `timesheet.list` |
| `timesheet/:id/details` | timesheet-details | `timesheet.view` |
| `timesheet-management` | Timesheet Management | `timesheetManagement.list` |
| `timesheet-management/:id/details` | timesheet-management-details | `timesheetManagement.view` |
| `reports` | Reports | `report.view` |
| `settings` | Settings | `setting.list` |
| `settings/organisation-details` | Organisation Details | `organisationSetting.view` |
| `settings/areas` | Area | `area.list` |
| `settings/holiday-calendars` | Holiday Calendar | `holidayCalendar.list` |
| `settings/payroll-calendars` | Payroll Calendar | `payrollCalendar.list` |
| `settings/earning-rates` | Earning Rate | `earningRate.list` |
| `settings/earning-rate-rules` | Award Rate | `awardRate.list` |
| `employees` | Employees | `employee.list` |
| `customers` | Customers | `customer.list` |
| `jobs` | Jobs | `job.list` |

## Catch-all

`/:catchAll(.*)*` → `ErrorNotFound`

## Web rebuild mapping

Use React Router paths identical to the above for parity.

## Mobile rebuild mapping

Stack navigators mirroring the same route names; org switcher sets active `orgCode`.
