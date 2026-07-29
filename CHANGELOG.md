# Changelog

## 2026-07-30

### Changed

- Mobile app is React Native CLI (bare `ios/` + `android/`) only
- Session persistence uses AsyncStorage
- Mobile env configured via `src/config/env.ts`
- Added Cursor rules and docs for root, backend, web, and mobile
- Expanded root README with detailed run instructions for backend, web, iOS, and Android

## 2026-07-29

### Added

- Root analysis documentation for monorepo rebuild (React web + React Native mobile + shared packages)
- API, backend, frontend, route, and component analysis derived from `backend/` and `origianl-frontend-vue-js/`
- `IMPLEMENTATION_PLAN.md`, `PROJECT_RULES.md`, `CODING_STANDARDS.md`, `RECOVERY_NOTES.md`, `MIGRATION_PROGRESS.md`
- npm workspaces monorepo: `packages/*`, `web/`, `mobile/`
- Shared packages: `@mysheet/api`, `types`, `validation`, `services` (ACL), `hooks`, `constants`, `theme`, `utils`
- Web app: Vite + React + Tailwind + auth + org shell + list pages for core domains
- Mobile app: React Native CLI + React Navigation + login + org home + timesheets list
- App docs under `web/docs/`, `mobile/docs/`, `backend/docs/`

### Notes

- Original Vue source unavailable; behaviour recovered from production Quasar build + backend source
- Backend behaviour intentionally unchanged
- Settings subpages, timesheet details, create dialogs, Xero/FCM still pending
