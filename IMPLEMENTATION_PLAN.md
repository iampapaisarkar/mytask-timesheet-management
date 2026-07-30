# Implementation Plan

## Phase 0 — Analysis ✅

- Backend route/controller/model/ACL map
- Vue production build route, layout, theme, form recovery
- Documentation set

## Phase 1 — Monorepo scaffold

- Root workspaces
- `packages/api`, `types`, `validation`, `constants`, `services`, `utils`, `theme`, `hooks`
- `web` Vite React TS app
- `mobile` React Native CLI TS app (`ios/` + `android/`)
- Env templates

## Phase 2 — Shared auth & API

- Axios client + interceptors (Bearer + org headers)
- Firebase auth wrapper interfaces (web/mobile adapters)
- Zustand auth + organisation stores
- Login / Signup / Forgot password / Session restore
- Protected route guards

## Phase 3 — Shell layouts

- Auth layout
- Main layout (post-login, org list / profile)
- Org layout (drawer navigation matching Vue menu)
- Theme tokens (`#6900ff` primary from Quasar build)

## Phase 4 — Feature pages (incremental)

Order (dependency + ACL frequency):

1. Organisation home
2. My Timesheets (list + detail)
3. Timesheet Management (list + detail + approve/reject)
4. Employees
5. Customers
6. Jobs
7. Management Groups
8. Settings hub + subpages (org details, regions, holidays, payroll calendars, earning rates, award rules)
9. Reports
10. Profile
11. Org invitation / Auth actions
12. Payroll integration connect flows
13. Notifications
14. Timesheet activity / location (mobile-first)

## Phase 5 — Parity & polish

- Pagination, search, filters
- Empty / loading / error states
- Socket.IO + FCM
- Accessibility & responsive web
- E2E smoke tests

## Phase 6 — Optimisation

- Code splitting, query caching policies, image assets, CI

Update `MIGRATION_PROGRESS.md` after each phase milestone.
