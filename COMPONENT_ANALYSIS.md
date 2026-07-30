# Component Analysis

Recovered component inventory from Quasar build chunk names and string literals.

## App-level

| Component | Role |
|-----------|------|
| AuthLayout | Auth pages shell |
| MainLayout | Post-login shell |
| OrgLayout | Org drawer + toolbar |
| ProfileMenu | User menu |
| SwitchOrganisation | Org switcher |
| RouteBack | Back navigation helper |
| ErrorNotFound | 404 |
| Notifications / QNotifications | Notification UI |

## Form / input primitives (rebuild as shared UI)

| Name | Role |
|------|------|
| MsSelect | Async/search select |
| MsDialog | Modal create/edit |
| DataTable | Paginated table |
| GoogleAddress | Address autocomplete + lat/lng |
| QForm / inputs | Quasar form controls → RHF equivalents |

## Feature forms

| Form | Fields recovered |
|------|------------------|
| Login | email, password |
| Signup | first/middle/last name, email, dob, password (Firebase) |
| Organisation details | name, code, website, phone, email, address, settings (submission frequency, leaves) |
| Customer | name, address, contact name/email/phone, hourly rate, active |
| Region | name |
| Holiday calendar | name, date, region |
| Payroll calendar | name, pay cycle, next period, start date, first payment |
| Earning rate | name, rate |
| Award rate rules | name, rounding settings, rule blocks (field/comparison/from/to/then) |
| Employee | multi-step: personal, address, employment, NOK, payroll, wages, invite |
| Job | name, customer, address, radius, management groups |
| Management group | name |
| Create timesheet | employee, period |
| Timesheet day view | status chips Draft/Submitted/Approved/Rejected; day rates loader |

## Charts / maps

- ApexCharts (reports)
- Google Maps (addresses, possibly activity)

## Rebuild priority components (web + mobile)

1. Button, TextInput, Select, Dialog, DataTable (web) / FlatList (mobile)
2. PageHeader, EmptyState, LoadingState, ErrorState
3. OrgDrawer / TabBar
4. StatusBadge (timesheet statuses)
5. Toast / Alert
