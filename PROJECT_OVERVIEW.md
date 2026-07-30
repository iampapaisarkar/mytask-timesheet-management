# Project Overview

## Product

**myTask** is a multi-tenant timesheet and workforce management application. Users belong to one or more organisations, work under organisation roles (`owner`, `moderator`, `manager`, `staff`), and manage timesheets, employees, jobs, customers, payroll calendars, earning/award rates, and reports.

## Source of truth

| Source | Status |
|--------|--------|
| `backend/` | Complete Node.js source — authoritative for APIs and business rules |
| `origianl-frontend-vue-js/` | Compiled Quasar/Vue production build only (source lost) |
| New `web/` + `mobile/` + `packages/` | Rebuild targets |

## Core domains

1. **Auth** — Firebase ID tokens verified by backend; app sessions stored in DB
2. **Organisation** — multi-org membership, invitations, org-scoped headers
3. **Timesheets** — employee self-service sheets + manager approval workflow
4. **Workforce** — employees, management groups, jobs, customers, areas
5. **Payroll settings** — holiday calendars, payroll calendars, earning rates, award rate rules
6. **Integrations** — Firebase Cloud Messaging, Socket.IO
7. **Activity** — geolocation / timesheet activity tracking (mobile-oriented)

## Platforms

- **Web** — full admin/management UI matching original Quasar app
- **Mobile** — same features where practical; prioritise timesheet entry, activity, notifications

## Non-goals (initial)

- Redesigning the product UX
- Changing backend API contracts
- Replacing Firebase Auth
- Enabling GraphQL (present but commented out in backend)
