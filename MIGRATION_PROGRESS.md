# Migration Progress

| Milestone | Status | Date | Notes |
|-----------|--------|------|-------|
| Backend analysis | ✅ Done | 2026-07-29 | Full API + ACL + auth |
| Vue build reverse engineering | ✅ Done | 2026-07-29 | Routes, layouts, theme, forms |
| Root documentation | ✅ Done | 2026-07-29 | See repo root `*.md` |
| Monorepo scaffold | ✅ Done | 2026-07-29 | workspaces + packages + apps |
| Mobile = React Native CLI | ✅ Done | 2026-07-30 | Bare ios/android project |
| Shared packages | ✅ Done | 2026-07-29 | api, types, validation, services, hooks, theme, constants, utils |
| Auth screens (web + mobile) | ✅ Done | 2026-07-30 | Web full; mobile login + tracking guards |
| **Organisation Vue Parity Plan** | ✅ Done | 2026-07-30 | Phases 0–7 implemented |
| Organisation home | ✅ Done | 2026-07-30 | Live status charts; ClockInOut mobile-only on web |
| Timesheets + day editor + map | ✅ Done | 2026-07-30 | Shared day editor + TrackingMapView |
| Timesheet management | ✅ Done | 2026-07-30 | Create, approve/reject/revert, day editor |
| Employees / Customers / Jobs / MG | ✅ Done | 2026-07-30 | Wizard, CRUD dialogs, GoogleAddress |
| Settings CRUD | ✅ Done | 2026-07-30 | Org edit + areas/holidays/payroll/rates/rules |
| Reports / Notifications | ✅ Done | 2026-07-30 | Reports page, notifications bell |
| Invitations + ACL guards | ✅ Done | 2026-07-30 | Org invitation + OrgAclRoute |
| Mobile BGL + ClockInOut | ✅ Done | 2026-07-30 | Transistorsoft + geolocation fallback |
| Mobile org shell + maps | ✅ Done | 2026-07-30 | Detail/day/TM/employees/settings + TrackingMap |
| Parity QA | ✅ Done | 2026-07-30 | Web `tsc` clean; key surfaces verified |
| MVP Payouts | ✅ Done | 2026-07-30 | API + web list/eligible/create/mark-paid |
| Global address system | ✅ Done | 2026-07-30 | Shared model + Places autofill + map geolocation/reverse-geocode |
| Timesheet requires Job | ✅ Done | 2026-07-30 | Many-to-many `timesheet_jobs`; create = Employee → Period → Jobs |
| Demo env reset + seed + QA | ✅ Done | 2026-07-30 | `npm run demo:reset-seed`; org `SILDEMO1`; see `DEMO_QA_REPORT.md` |
| Reports Phase 1 (async) | ✅ Done | 2026-07-30 | Queue-backed hours report + role ladder + redesigned UI |
| Reports pay PDF | ✅ Done | 2026-07-30 | Single employee + approved timesheet; day amounts; PDF download/email; `(You)` labels |
| Realtime Socket.IO architecture | ✅ Done | 2026-07-30 | Shared `@mytask/realtime`; JWT gateway; org/user rooms; domain stores; logout wipe |
| Org logout + Back to myTask + web FCM + legal | ✅ Done | 2026-07-30 | Shared logout; notification routing; SW push; Help/Terms/Privacy |
| Enterprise payouts + role dashboard | ✅ Done | 2026-07-31 | Workflow statuses, audit, snapshots, filters/export, live payroll KPIs |
| Enterprise auth hardening | ✅ Done | 2026-07-31 | `@mytask/auth` TokenManager; Admin verifyIdToken; sessions by token_hash; socket auth rotation |
| Enterprise API architecture | ✅ Done | 2026-07-31 | Split dashboard APIs; middleware suite; parallel RQ; lazy web routes; layered dashboard service |
| Enterprise System Logs & Audit | ✅ Done | 2026-07-31 | Internal/external/email audit tables; async queue; middleware; System Logs UI; retention |
| Server-side list pagination (10/page) | ✅ Done | 2026-07-31 | All org tables (employees, customers, jobs, timesheets, payouts, calendars, system logs) use page size 10 + Previous/Next |
| Stripe subscription system | ✅ Done | 2026-07-31 | Free/Pro; Checkout; webhooks; usage limits; daily expiry cron + 6h Stripe sync; payment-fail → Free + reason emails; web+mobile billing UI; `docs/STRIPE_SUBSCRIPTIONS.md` |
| Firebase Google Sign-In (web + mobile) | ✅ Done | 2026-08-01 | Web popup/redirect; native Google Sign-In; Firebase persistence; see `docs/GOOGLE_SIGN_IN.md` |
| Mobile parity + UX overhaul (phase 1) | ✅ Done | 2026-08-01 | Safe areas / premium tab bar / nav transitions; `@gorhom/bottom-sheet`; Google Maps + minimal style; timesheet day mobile redesign + save; TM detail approve/reject; Reports/Payouts/System logs; auth signup/forgot; settings hubs; create org |

## Vue ↔ Web ↔ Mobile gap matrix

| Vue route / surface | Web | Mobile | Notes |
|---------------------|-----|--------|-------|
| `/` org picker + create | ✅ | ✅ | Create organisation screen |
| `/org-invitation` | ✅ | — | Token verify + accept (deep link TBD) |
| Pending invitations inbox | ✅ | — | HomePage |
| Notifications chrome | ✅ | ✅ | List + deep-link to TM detail |
| Route/action ACL | ✅ | Partial | OrgHome gates + create gates; stack ACL TBD |
| `/org/:code` home + charts | ✅ | ✅ | KPIs + weekly bars + ClockInOut |
| ClockInOut tracking | Notice (correct) | ✅ | BGL + fallback |
| `timesheet` list/detail/day | ✅ | ✅ | Day editor + segmented Sheets/Timeline/Map |
| `timesheet-management` | ✅ | ✅ | List + detail approve/reject/revert/submit |
| `reports` | ✅ | ✅ | Pay report request flow |
| `payouts` | ✅ | ✅ | List + pagination |
| `settings` + CRUD | ✅ | Partial | Hub + org/holiday/payroll lists; rates TBD |
| `employees` wizard | ✅ | Partial | List + create sheet; full edit/invite TBD |
| `customers` / `jobs` / MG | ✅ | Partial | List + create sheets; Places address TBD |
| Timesheet day MapView | ✅ | ✅ | Google Maps only + minimal custom style |
| System logs | ✅ | ✅ | Internal/external/email tabs |
| Signup / forgot password | ✅ | ✅ | Firebase + backend signup |
| Legacy payroll integration removal | ✅ | 2026-07-30 | Removed runtime and UI integration |
| BackgroundGeolocation | N/A | ✅ | See `mobile/docs/TRACKING.md` |

**Not in Vue (intentionally omitted):** standalone Live Tracking, Attendance, Schedule pages.

## Current focus

Mobile parity phase 1 shipped (nav chrome, maps, day editor, TM approvals, reports/payouts/logs, auth onboarding). Remaining: org invitation deep links, pending invitations inbox, employee/customer/job full edit wizards + address picker, settings CRUD write paths, profile edit, FCM push, deeper payout actions.
