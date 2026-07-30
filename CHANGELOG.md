# Changelog

## 2026-07-30

### Fixed

- Duplicate employees in list/dropdowns/reports: root cause was duplicate `user_organisation_roles` rows for the same `(user_id, organisation_id)`, multiplied by an unscoped `hasOne` join on `user_id` in the Employees defaultScope
- Deduped existing UOR/employee rows and added unique indexes on `(user_id, organisation_id)` for both tables
- Scoped UOR includes to the employee/org context; invite accept now updates an existing role instead of always inserting
- Org bootstrap (`Employees.organisation_id` unknown in ON clause): stop joining UOR inside Employees defaultScope; attach the org-scoped role in `afterFind` so nested `employee` aliases work

### Added

- Timesheet ↔ jobs many-to-many (`timesheet_jobs`): one timesheet can include multiple jobs; the same job can be used by many employees
- Timesheet create flow is Employee → Pay Period → Jobs (multi-select)
- Timesheet list filters by employee / job / status (management) and job / status (self-service)
- Shared address model, map geolocation reverse-geocode, and related DB migration (earlier today)
- Canonical global address model (`address_line_1`, `address_line_2`, `street`, `city`, `state_region_province`, `postal_code`, `country`) with shared parsers in `@mytask/utils`
- Safe DB migration to add/backfill normalized address columns on organisation/employee/job address tables and customers
- Map picker geolocation on open, debounced reverse-geocode of all address fields on pin move
- MVP Payouts API under `/api/payouts` (`list`, `eligible`, `create`, `/:id/mark-paid`) with org ACL (`payout.list` / `create` / `edit`)
- Web Payouts page for eligible approved timesheets and marking payouts paid
- Currency support (USD/AUD/INR/GBP/EUR/NZD/CAD/SGD) on employee wages and customer pricing
- Interactive Google Map location picker for job site coordinates (pin drop + reverse geocode)
- Job edit flow on the jobs list

### Changed

- Timesheet uniqueness is per employee + pay period; jobs are attached via `timesheet_jobs` (many-to-many)
- Day editor working entries pick from the timesheet’s selected jobs (auto when only one job)
- Address forms always keep auto-filled fields editable; jobs embed map via reusable `GoogleAddressAutocomplete` (`showMap`)
- Address persistence writes canonical + legacy columns; coordinates stored for jobs only (org/employee/customer coords cleared on write)
- Mobile app is React Native CLI (bare `ios/` + `android/`) only
- Session persistence uses AsyncStorage
- Mobile env configured via `src/config/env.ts`
- Added Cursor rules and docs for root, backend, web, and mobile
- Expanded root README with detailed run instructions for backend, web, iOS, and Android
- Removed external payroll integration runtime paths and deprecated obsolete payroll-sync endpoints to keep the production API aligned with currently supported workflows
- Removed geographic lookup (regions) API/UI and related employee/holiday calendar links so org settings stay role-and-calendar based only
- Added defensive schema retirement migration to drop leftover group/lookup/external-sync tables and columns from existing databases
- Removed archived Vue reference frontend and historical create/drop migrations for retired modules to keep the monorepo free of those product surfaces
- Removed earning rates and award-rate rule engine; timesheet pay uses hourly XOR fixed employee wage rates
- Redesigned employee wage/payroll (employment type, pay type, Cash/Direct Debit/Bank Transfer); removed next-of-kin
- Aligned organisation ACL (manager employee CRUD, owner customer delete, gated org settings edit, payout permissions)
- Required holiday + payroll calendars before operational creates; blocked moderator/manager self-approve/reject
- Payroll calendars are view-only in settings UI; further creates are blocked after the first calendar; new organisations auto-receive a default payroll calendar
- Removed Active status from customers and jobs
- Holiday calendar list includes an explicit Edit action

## 2026-07-29

### Added

- Root analysis documentation for monorepo rebuild (React web + React Native mobile + shared packages)
- API, backend, frontend, route, and component analysis derived from `backend/` and `origianl-frontend-vue-js/`
- `IMPLEMENTATION_PLAN.md`, `PROJECT_RULES.md`, `CODING_STANDARDS.md`, `RECOVERY_NOTES.md`, `MIGRATION_PROGRESS.md`
- npm workspaces monorepo: `packages/*`, `web/`, `mobile/`
- Shared packages: `@mytask/api`, `types`, `validation`, `services` (ACL), `hooks`, `constants`, `theme`, `utils`
- Web app: Vite + React + Tailwind + auth + org shell + list pages for core domains
- Mobile app: React Native CLI + React Navigation + login + org home + timesheets list
- App docs under `web/docs/`, `mobile/docs/`, `backend/docs/`

### Notes

- Original Vue source unavailable; behaviour recovered from production Quasar build + backend source
- Backend behaviour intentionally unchanged
- Settings subpages, timesheet details, create dialogs, and FCM were pending at that stage
