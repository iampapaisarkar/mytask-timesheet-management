# Demo Environment QA Report

Generated: 2026-07-30 19:09:11 +05:30  
Revalidated after integrity fix; automated tests: **5/5 pass**.

## Summary

- Passed (seed integrity checks): **35**
- Failed: **0**
- Warnings: **0**
- Automated tests (`npm test`): **5 passed** (ACL ×4, org signup ×1)

## Demo organisation

| Field | Value |
|-------|--------|
| Name | MyTask Siliguri Demo Pvt Ltd |
| Code | **SILDEMO1** |
| Owner login | iampapaisarkar@gmail.com (Firebase UID `FrWhaCfUPlY53tWNM1zrXArMHXW2`) |

### Demo users

| Role | Name | Email |
|------|------|-------|
| Owner (Org Admin) | Papai Sarkar | iampapaisarkar@gmail.com |
| Moderator | Rahul Sarkar | iampapai619@gmail.com |
| Manager | Megha Sarkar | iammeghachowdhury@gmail.com |
| Staff | Pritth Sarkar | iampritth@gmail.com |
| Staff | Bishakha Chowdhury | iammeghasarkar@gmail.com |

## Seeded data volume

| Table | Rows |
|-------|------|
| users | 5 |
| employees | 5 |
| user_organisation_roles | 5 |
| employee_invitations (accepted) | 4 |
| customers | 4 |
| jobs (+ Siliguri coordinates) | 10 |
| payroll_calendars (Weekly/Fortnightly/Monthly) | 3 |
| holiday_calendars | 7 |
| timesheets (draft/submitted/approved/rejected mix) | 5 |
| timesheet_days | 25 |
| timesheet_day_tasks | 150 |
| timesheet_activity_logs | 150 |
| geofence_events | 100 |
| email_send_logs | 8 |
| notifications | 5 |

## Features validated

| Area | Result | Notes |
|------|--------|-------|
| DB reset (preserve seeders) | ✅ | Lookup tables + SequelizeMeta kept |
| Org signup artefacts | ✅ | Membership, employee, wage, payroll, holiday, payroll calendar |
| Firebase UID mapping | ✅ | `firebase_providers` + `users.firebase_user_id` |
| Invitations invited→accept + email logs | ✅ | Simulated send/accept (no live SMTP required) |
| Roles & ACL matrix | ✅ | Automated tests + seed checks |
| Customers / jobs | ✅ | Indian/Siliguri realistic data |
| Payroll period calc | ✅ | WEEKLY/FORTNIGHTLY/MONTHLY end dates |
| Holidays | ✅ | National + local |
| Timesheets + tasks + GPS activity | ✅ | Travel/break/work, late/early patterns |
| Geofence **events** | ✅ | No geofence **definition** table in schema |
| Integrity (dupes/orphans/FK) | ✅ | 0 issues |
| Live HTTP E2E (auth/UI) | ⚠️ Not run here | Requires running API + Firebase login smoke |

## Schema notes (intentional limitations)

- No `geofences` definition table — Siliguri sites stored as jobs + `job_address` coordinates; movement logged in `geofence_events`.
- No dedicated `employee_profiles` / `audit_logs` tables — profile = employees + address + wage + payroll; audit ≈ `email_send_logs` / activity logs.
- No job↔staff assignment table (management groups retired) — assignment is via timesheets + jobs.
- Customers have no status/notes columns in schema.
- Holiday model has no paid/unpaid/type columns — name + date only.

## Org signup product fix (shipped)

On organisation create the API now also:

1. Creates a starter holiday calendar (so setup gate is satisfied)
2. Creates owner employee **wage + payroll** linked to the default payroll calendar

Covered by `backend/tests/organisation-signup.test.js`.

## How to re-run

```bash
cd backend
npm run seed:all          # if lookups empty
npm run demo:reset-seed   # wipe app data + rebuild demo
npm test                  # ACL + signup tests
```

## Suggested follow-ups before Reports/Payouts work

1. Manual web login as owner → org `SILDEMO1` and smoke list pages (employees, jobs, timesheets, reports, payouts).
2. Wire `npm test` into CI.
3. Optional product decision: add a real geofence-definitions table if reusable polygons are required beyond job radius.

## Failed

- None

## Warnings

- None (live UI/API smoke deferred — see table above)
