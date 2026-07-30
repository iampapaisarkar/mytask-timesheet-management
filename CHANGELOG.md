# Changelog

## 2026-07-30

### Added

- MVP Payouts API under `/api/payouts` (`list`, `eligible`, `create`, `/:id/mark-paid`) with org ACL (`payout.list` / `create` / `edit`)
- Web Payouts page for eligible approved timesheets and marking payouts paid

### Changed

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
