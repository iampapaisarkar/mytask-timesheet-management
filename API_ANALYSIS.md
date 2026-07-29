# API Analysis

Base path: `/api`  
Auth header: `Authorization: Bearer <firebaseIdToken>`  
Org headers (org-scoped): `ms-organisation-code`, `ms-organisation-id`, `ms-organisation-name`

## Auth — `/api/auth`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/login` | Bearer (Firebase) | Create session, return user |
| POST | `/signup` | Bearer (Firebase) | Register user + providers |
| POST | `/forgot-password` | Public | Password reset |
| POST | `/verify-organisation-invitation-token` | Public | Validate invite token |
| POST | `/logout` | Token | End session |
| GET | `/user` | Token | Current user |
| POST | `/update-profile` | Token | Update profile |
| POST | `/update-fcm-token` | Token | Store FCM token |

## Organisations — `/api/organisations`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/list` | Token |
| GET | `/:orgCode/get` | Token |
| POST | `/create` | Token |
| POST | `/update` | Token + OrgValidate |
| POST | `/update-settings` | Token + OrgValidate |
| GET | `/organisation-invitations` | Token |
| POST | `/accept-invitation` | Token |
| POST | `/reject-invitation` | Token |

## Timesheets — `/api/timesheets` (Token + Org)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/list` | List my timesheets |
| GET | `/:id/get` | Get timesheet |
| GET | `/:id/get-day` | Get day |
| POST | `/:id/save` | Save |
| POST | `/:id/submit-for-approval` | Submit |

## Timesheet management — `/api/timesheet-management` (Token + Org)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/list` | Manager list |
| GET | `/:id/get` | Get |
| GET | `/:id/get-day` | Get day |
| POST | `/create` | Create for employee/period |
| POST | `/:id/save` | Save |
| POST | `/:id/submit-for-approval` | Submit |
| POST | `/:id/approve` | Approve |
| POST | `/:id/reject` | Reject |
| POST | `/:id/revert` | Revert |
| GET | `/:employee_id/employee-payroll-cycles` | Payroll cycles |

## Employees — `/api/employees`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |
| POST | `/:id/invite` |
| POST | `/search-user-by-email` |

## Management groups — `/api/management-groups`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Region — `/api/region`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Customers — `/api/customers`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Jobs — `/api/jobs`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Holiday calendars — `/api/holiday-calendars`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Payroll calendars — `/api/payroll-calendars`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/pull-from-xero-to-app` |

## Earning rates — `/api/earning-rates`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## Award rates — `/api/award-rates`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/create` |
| POST | `/:id/update` |

## System lookups — `/api/system` (Token; many need Org)

| Method | Path |
|--------|------|
| GET | `/organisation-roles` |
| GET | `/regions` |
| GET | `/nok-relations` |
| GET | `/customers` |
| GET | `/earning-rate-types` |
| GET | `/leave-categories` |
| GET | `/timesheet-submission-frequencies` |
| GET | `/pay-cycles` |
| GET | `/award-rate-rule-fields` |
| GET | `/award-rate-rule-days` |
| GET | `/rounding-intervals` |
| GET | `/manager-employees` |
| GET | `/manager-staff-employees` |
| GET | `/management-groups` |
| GET | `/employment-status` |
| GET | `/employment-types` |
| GET | `/payroll-calendars` |
| GET | `/award-rates` |
| GET | `/earning-rates` |
| GET | `/employees` |
| GET | `/jobs` |
| GET | `/employee-timesheets` |
| GET | `/states` |

## Notifications — `/api/notifications`

| Method | Path |
|--------|------|
| GET | `/list` |
| POST | `/:id/mark-as` |
| POST | `/mark-all-as` |
| POST | `/send` |

## Timesheet activity — `/api/timesheet-activity`

| Method | Path | Auth |
|--------|------|------|
| POST | `/store` | Token + Org |
| POST | `/send-location` | Public (device) |
| GET | `/` | Token + Org |
| GET | `/validate` | Token + Org |
| GET | `/simulate` | Dev/sim |

## Reports — `/api/reports`

| Method | Path |
|--------|------|
| GET | `/rate-by-per-timesheet-day` |

## Xero — `/api/xero`

| Method | Path |
|--------|------|
| POST | `/connect` |
| POST | `/finalize` |
| POST | `/disconnect` |
| GET | `/fetch-earning-rates` |
| GET | `/fetch-accounts` |
| GET | `/fetch-payroll-calendars` |
| POST | `/push-data` |
| POST | `/push-timesheet` |
| GET | `/fetch-test-data` |

## Test utilities (not for production UI)

- `GET /api/mail-test`
- `GET /api/socket-io-test`
- `GET /api/firebase-notification-test`
- `GET /api/firebase-messaging-test`
