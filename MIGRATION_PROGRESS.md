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

## Vue ↔ Web ↔ Mobile gap matrix

| Vue route / surface | Web | Mobile | Notes |
|---------------------|-----|--------|-------|
| `/` org picker + create | ✅ | ✅ list | |
| `/org-invitation` | ✅ | — | Token verify + accept |
| Pending invitations inbox | ✅ | — | HomePage |
| Notifications chrome | ✅ | — | NotificationsBell |
| Route/action ACL | ✅ | Partial | OrgAclRoute + create gates |
| `/org/:code` home + charts | ✅ | ✅ shell + nav | Status from live lists |
| ClockInOut tracking | Notice (correct) | ✅ | BGL + fallback |
| `timesheet` list/detail/day | ✅ | ✅ | Day editor + map |
| `timesheet-management` | ✅ | ✅ list | Web has full detail |
| `reports` | ✅ | — | rate-by-day |
| `payouts` | ✅ | — | MVP eligible + mark paid |
| `settings` + CRUD | ✅ | ✅ hub | Mobile hub placeholders |
| `employees` wizard | ✅ | ✅ list | |
| `customers` / `jobs` / MG | ✅ | — | GoogleAddress + radius |
| Timesheet day MapView | ✅ | ✅ | Maps or coordinate fallback |
| Legacy payroll integration removal | ✅ | 2026-07-30 | Removed runtime and UI integration |
| BackgroundGeolocation | N/A | ✅ | See `mobile/docs/TRACKING.md` |

**Not in Vue (intentionally omitted):** standalone Live Tracking, Attendance, Schedule pages.

## Current focus

Parity shipped. Next refinements: full award-rate IF/THEN builder, enable native Transistorsoft autolinking with license, deeper mobile settings CRUD.
