# Routes

Router mount: `app.use('/api', Routes)` from `routes/index.js`.

Domain routers:

- `auth`, `organisation`, `timesheet`, `timesheet-management`, `employee`
- `area`, `customer`, `job`
- `holiday-calendar`, `payroll-calendar`
- `system`, `notifications`, `timesheet-activity`, `report`, `payout`, `screens`

## Payouts (`/api/payouts`)

Internal payroll records (not bank transfers). Generated from approved timesheets.

| Method | Path | ACL | Notes |
|--------|------|-----|-------|
| GET | `/list` | `payout.list` | Filters: `status`, `from`, `to`, `search`, `employee_id`, pagination |
| GET | `/eligible` | `payout.list` or `create` | Approved timesheets without an active payout |
| GET | `/export` | `payout.list` | CSV export |
| GET | `/:id` | `payout.view` or `list` | Detail + audit events |
| POST | `/create` | `payout.create` | Snapshot from rate service; `as_draft` optional |
| POST | `/:id/submit` | `payout.edit` | Draft → Pending Approval |
| POST | `/:id/approve` | `payout.edit` | Pending → Approved |
| POST | `/:id/release` | `payout.edit` | Approved → Ready for Payout |
| POST | `/:id/mark-paid` | `payout.edit` | Ready → Paid |
| POST | `/:id/cancel` | `payout.edit` | Cancel (not from Paid) |
| POST | `/:id/adjust` | `payout.edit` | Adjust deductions/bonuses/tax on non-terminal statuses |

Statuses: `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `READY_FOR_PAYOUT` → `PAID` (or `CANCELLED`).

See [API_ANALYSIS.md](../../API_ANALYSIS.md).
