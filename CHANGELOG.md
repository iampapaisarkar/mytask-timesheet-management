# Changelog

## 2026-08-02

### Fixed

- **Mobile timesheet live parity:** Timesheet days, day editor (sheets / timeline / map) now use org Socket.IO + `GET /timesheet-activity/live` (`useTrackingLive`) like web, instead of device-local tracking only. Open hours keep ticking; map refreshes when GPS breadcrumbs change.

### Fixed

- **Open session hours tick without GPS movement:** Timeline, grid, and timesheet day tables now advance working / travel / break time while a session is open even if the user stays still. Map polylines still only change when new location breadcrumbs arrive. Read APIs expose provisional `total_hours` + `is_open` for open tasks (`end_time` stays null; nothing persisted).

### Changed

- **Live indicators:** Use app primary color (`#04B6B1`) instead of green; mobile org home banner copy is “Timer and Location tracking is on” with a full pill radius.

### Fixed

- **Live tracking on web:** `tracking.updated` now also invalidates timesheet + management day tables (not only the day editor). Day sheet / timeline / grid / map refetch while GPS is streaming; org chrome and timesheet pages show a blinking green Live indicator.
- **Tracking Start stuck on Stopped:** Activity status now treats the latest typed log as open only when it is a START row (`start_at` set). END rows no longer make Start look idempotent while the UI stays Stopped.

### Added

- **Tracking live indicators:** Blinking green cue on web org header + timesheet day views when Socket.IO reports active tracking; on mobile Org Home + Org Header when this device has an open tracking session. Web also hydrates from `GET /timesheet-activity/live` so Live shows immediately on page load.

### Fixed

- **Live tracking UI:** Successful location / activity store emits `tracking.updated` to the organisation Socket.IO room (workers use Redis emitter). Web + mobile invalidate day editor + timesheet tables so map, timeline, and days refresh while a day is open. Continuous GPS emits are throttled (~3s); start/pause/resume/stop emit immediately.

### API

- **Durable tracking auth tokens:** New table `tracking_auth_tokens` (SHA-256 hash only). Mobile login/signup (`platform: ios|android`) returns `tracking_token` + `tracking_token_expires_at` (90-day TTL). `POST /api/auth/tracking-token` re-issues while Firebase session is valid. Logout revokes active tokens.
- `POST /api/timesheet-activity/store` and `POST /api/timesheet-activity/send-location` authenticate **only** via `Authorization: Bearer mttrk_…` (`TrackingTokenValidate`). FCM identity and Firebase ID tokens are no longer accepted on these routes.

### Changed

- **Mobile tracking auth:** Persist tracking token in AsyncStorage; configure Transistorsoft BGL HTTP with the tracking Bearer (not Firebase). Activity store calls send the same header. Foreground Start re-issues via `/auth/tracking-token` if missing/near expiry.

### Fixed

- **Tracking without FCM on mobile:** Location posts no longer require an FCM token (mobile never registered push). Replaced by durable tracking tokens (see above).

### Added

- **Mobile background tracking:** Floating org-tab tracking FAB opens a full-screen Tracking screen (Start / Pause / Resume / Stop, elapsed timer, activity status). Uses Transistorsoft `react-native-background-geolocation` (HTTP autoSync + headless) with org-scoped sessions. Pause supports optional remarks.

### API

- `GET /api/timesheet-activity` — also returns `status`, `current_activity` (`code`, `name`, `job_id`)
- `GET /api/timesheet-activity/validate` — requires draft timesheet **and** ≥1 assigned job; clearer error codes (`NO_TIMESHEET`, `NO_ASSIGNED_JOBS`, …)
- `POST /api/timesheet-activity/store` — returns activity status snapshot; accepts optional `remarks` on `type: "pause"`; owners allowed; rejects start when another org has an open tracker (`409` / `TRACKING_OTHER_ORG_ACTIVE`)
- Migration: `timesheet_activity_logs.job_id` for same-job / resume geofence logic
- Geofencing uses jobs assigned to the current timesheet (`timesheet_jobs`)

### Fixed

- **Jobs list search:** `GET /api/jobs/list?search=` no longer references removed `jobs.address`. Search uses `job_address` fields (and customer name), matching the employee list pattern. Fixes 500 `Unknown column 'Jobs.address'` on web and mobile job search.

### Changed

- **Mobile web feature parity:** Organisation details now loads/edits full org profile (email, phone, website, address, reporting currency, timesheet frequency) like web. Customers gain currency picker; employees list gains Invite; timesheet lists gain job/employee filters; payouts gain search + date range; system logs gain search/date/success filters, summary, detail sheet, and CSV export. AuthActions + BillingSuccess screens and notification deep-link routing added; forgot-password uses `authApi` with Firebase fallback.

- **Billing invoices (web + mobile):** Download PDF / View invoice now use **myTask-generated** invoices (PDFKit + branded HTML/detail screens), not Stripe hosted PDF/receipt URLs. Receipt emails attach the myTask PDF and link to `/billing/:id`.
- **Invoice view parity:** Web and mobile invoice detail screens share the same content model as the PDF (bill-to, period, line description, total) from `GET /billing-history/:id`.

### API

- `GET /api/subscriptions/billing-history/:id` — invoice JSON
- `GET /api/subscriptions/billing-history/:id/pdf` — myTask invoice PDF
- `GET /api/subscriptions/billing-history/:id/view` — branded HTML invoice
- Billing history list no longer exposes Stripe `invoice_pdf_url` / `hosted_invoice_url` to clients (`has_invoice: true` instead).

## 2026-08-01

### Changed

- **Form validation UX (web + mobile):** field validation uses React Hook Form + Zod from `@mytask/validation` with inline errors under inputs (Signup pattern). Validation toasts removed; toasts remain for API success/error only. Mobile adds error haptic once per failed submit, keyboard Next/Dismiss field chaining, and `FormTextField` / `useAppForm` helpers.

### Fixed

- **List pagination totals:** Jobs, Customers, Holiday calendars, and Payroll calendars list APIs now use the Sequelize `count` for `total_rows` / `total_pages` (were incorrectly using the current page length, so Next stayed disabled after a full page of 10). Jobs / Payroll calendars count uses a table-qualified `col` (`Jobs.id` / `PayrollCalendars.id`) to avoid ambiguous `DISTINCT(id)` with joins.

### Added

- **Firebase Google Sign-In (web + Android + iOS):** reusable `services/firebase` auth modules; web popup with redirect fallback; native `@react-native-google-signin/google-signin` → Firebase credential; RN Auth persistence via `getReactNativePersistence`; logout clears Firebase (+ Google on native). See `docs/GOOGLE_SIGN_IN.md`.

### API

- `POST /api/auth/login` links the Firebase UID into `firebase_providers` (supports Google provider UIDs for `TokenValidate`). Unknown emails return `404` / `AUTH_USER_NOT_FOUND` with a clear sign-up message.

## 2026-07-31

### Changed

- **Subscription expiry / payment failure:** daily cron + 6h Stripe sync; payment failure and unpaid/canceled immediately move the user to **Free** (Pro features disabled). Billing lifecycle emails always send (even on Free) with the end reason. Subscription UI shows `end_reason_message` + Resubscribe CTA.

### Added

- **Stripe subscription system (Test Mode ready):** user-owned Free/Pro plans, Checkout + Customer Portal, signed webhooks, billing history, usage counters, plan-limit middleware on org/employee/customer/job/timesheet/report/system-logs, BullMQ subscription worker (expiry reminders, webhook cleanup), web Pricing/Subscription/Billing pages, mobile Pricing/Subscription/Billing screens. See `docs/STRIPE_SUBSCRIPTIONS.md`.

### API

- New `/api/subscriptions/*` routes (plans, current, usage, checkout, portal, cancel, billing-history, webhook). Signup auto-assigns Free. Org create hard-cap replaced by plan limits (Free 1 / Pro 5).

### Added

- Notifications **See more** opens a paginated notifications table (`/org/:orgCode/notifications`); bell preview shows the latest 10. Web mobile viewport uses a full-screen notifications sheet; mobile app has a full-screen Notifications list.


### Fixed

- Notifications list API `pagination.total_rows` now reflects the full count (was incorrectly the current page length)
- FCM System Logs: partial multicast success (some stale `NotRegistered` tokens) is no longer logged as a hard failure; invalid tokens are pruned from `fcm_connections`

### Changed

- Reports PDF redesigned for client/executive sharing: branded header, summary cards, richer details (employee, jobs, customers, status, approval remarks, pay breakdown), professional daily table with repeating headers, and page footers (`Page X of Y`)
- Report email uses a dedicated `report.html` template with a meaningful body (report name, period, employee, totals, generated by/on) instead of a blank/broken message inside `timesheet.html`

### Fixed

- Reject timesheet email/push body was empty because `bodyMessage` was never set for the `reject` notification type; it now includes the rejection reason when present.

### Changed

- Timesheet status transitions (**submit / approve / reject / revert**) require non-empty **remarks**; Cancel on the remarks dialog never calls the status API. Web management detail no longer shows an always-editable Actions remarks field when no action is available — existing approval/reject remarks render as read-only text.

### Removed

- Unused **timesheet day status** (lookup table + UI column). Day rows never had a real `status_id`; the days table Status always showed "—". Editing permissions continue to use **timesheet-level** status (`timesheet_status`).

### Added

- Mobile list search/filters: timesheet code search (My Sheets + Management), employee name/email/address search, Customers + Jobs screens with search, Jobs customer filter; shared `SearchBar` + debounced queries
- Web list search: My Sheets + Timesheet Management (code), Customers (name/email), Jobs (name + customer filter), Employees (name/email/address)
- Jobs list API supports `customer_id` filter; employee `search` includes address fields

### Changed

- Web Employees: replaced country-code filters with a single name/email/address search box

### Fixed

- Employee list no longer shows **Invite** on the organisation creator’s self-employee row (`is_you` / owner); invite API also rejects self/owner invites

### Fixed

- **System Logs → External** logs Firebase Auth Admin `verifyIdToken` on real Admin SDK calls (login + request auth cache miss), with organisation attribution — not only FCM
- **System Logs → External** now receives org-scoped rows: FCM passes organisation/user (or resolves from recipient membership); Firebase Auth Admin + Identity Toolkit password-reset/verification calls are logged via `storeExternalApiCallLog`

### Fixed

- List tables (including System Logs) now paginate correctly with a default of **10 rows** per page; clients read `pagination` from the enterprise envelope (`info` / `meta`)
- Payouts list returns `{ data, pagination }` instead of loading up to 100 rows without page metadata

### Changed

- Shared `DEFAULT_LIST_PAGE_SIZE = 10`; list hooks return `{ data, pagination }` via `listRows` / `extractPagination`

### Added

- Enterprise **System Logs** module: org-scoped audit UI (`/org/:orgCode/system-logs`) with Internal / External / Email tabs, filters, CSV export, detail drawer, and dashboard widgets
- Audit schema: `audit_internal_api_logs`, `audit_external_api_logs`, `audit_email_logs` with indexes for high-volume reads
- Async `auditQueue` writer + request-audit middleware (non-blocking); email/FCM/external helpers enqueue enterprise logs with redaction
- ACL resource `systemLog` (owner/moderator/manager list+view; staff list own rows only); retention job (`AUDIT_LOG_RETENTION_DAYS`, default 90)

### Added

- Enterprise API architecture: split dashboard into `summary` / `graphs` / `recent` / `pending` endpoints; aggregate `/screens/dashboard` retained
- Backend layered dashboard (`repository/` + `dashboard.service.js`); Redis-shared context for parallel slice loads
- Middleware: correlation ID, security headers, request logger, Redis rate limiter, fixed error-handler order
- Additive enterprise response fields (`success`, `meta`, `errors`, `requestId`) alongside legacy `info`
- Client `useDashboardParallel()` (TanStack `useQueries`) on web + mobile org home; web route-level code splitting
- Mobile `src/features/*` feature entrypoints aligned with web

### Security

- Login rejects Firebase token / body email mismatch
- Production gates test routes (`ENABLE_TEST_ROUTES`) and activity simulate (`ENABLE_ACTIVITY_SIMULATE`)
- Activity `send-location` requires `userId` + `organisationCode` (BGL-compatible)
- Stop logging DB password on server boot; optional `CORS_ORIGINS` allowlist in production

### Fixed

- Random logouts: clients no longer send stale stored JWTs; `@mytask/auth` TokenManager single-flights Firebase ID token refresh, Axios retries once on 401 after force refresh, and sockets reconnect with rotated tokens

### Changed

- Backend auth uses Firebase Admin `verifyIdToken(checkRevoked)` with Redis claims cache and structured codes (`AUTH_MISSING` / `AUTH_EXPIRED` / `AUTH_REVOKED` / …); `user_sessions` is device audit keyed by `token_hash` (raw JWT no longer the session primary key)
- Docs: `docs/AUTH_ARCHITECTURE.md`, `backend/docs/AUTHENTICATION.md`, `docs/ENTERPRISE_API_ARCHITECTURE.md`

### Added

- Organisation `default_currency` (reporting currency) with country→currency mapping; dashboard payroll KPIs convert into that currency via Frankfurter ECB rates (fallback open.er-api)
- System FX endpoints: `GET /api/system/exchange-rates`, `GET /api/system/convert-currency`
- Locale-aware phone country + currency defaults (`detectLocalePreferences`, `useLocaleDefaults`); docs in `docs/CURRENCY_AND_LOCALE.md`

### Changed

- Dashboard money widgets use API `display_currency` (no silent AUD fallback)
- Global phone inputs default to the user’s current country from browser/device locale
- Org create/update persists reporting currency; owner wage seed uses org currency (not hard-coded INR)
- Default unsupported-currency fallback is USD (was AUD)

### Added

- Enterprise payout workflow: statuses `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `READY_FOR_PAYOUT` → `PAID` / `CANCELLED`, validated transitions, frozen rate snapshots (hours, OT, gross/net, deductions/bonuses/tax), payout numbers, and `payout_events` audit trail
- Payout APIs: `GET /:id`, submit/approve/release/cancel/adjust, CSV export; unique active payout per timesheet (cancelled excluded via generated key)
- Role-based live org dashboard KPIs: employees, hours, payroll this month, pending/paid payouts, payroll trend, payout status distribution, staff latest payout
- Web Payouts page: filters (status/date/search), eligible create/draft, workflow actions, detail + audit, CSV export
- ACL: moderator full payout; manager/staff list+view (staff scoped to self; manager to assigned employees)

### Changed

- Reports pay cycle prefers frozen payout snapshot amounts when a payout exists; treats `CANCELLED` like former `VOID`
- Shared ACL helper accepts role objects (`{ code }`) as well as role code strings

## 2026-07-30

### Added

- Org UI Logout (shared `useLogout` + full state wipe); organisation switcher **Back to myTask**; centralized `resolveNotificationPath`; web FCM (service worker, token registration, foreground toasts, background click navigation); Help & FAQ, Terms, and Privacy pages with auth/settings links
- Docs: `docs/WEB_PUSH_NOTIFICATIONS.md`, `docs/QA_VERIFICATION_LOGOUT_NOTIFICATIONS_FCM.md`

### Changed

- Notification bell uses in-app navigation (no `window.location.assign`); invitation pushes include deep-link URL; FCM data always carries `url`
- Removed showcase / Joel Couchman disclaimer from web and mobile auth surfaces

### Added

- Production Socket.IO realtime architecture: shared `@mytask/realtime` contracts, JWT handshake gateway, `org:{id}` / `user:{id}` rooms, domain events (`employee.*`, `timesheet.*`, `payout.*`, `report.*`, `notification.created`, `auth.logout`), web + mobile singleton clients, Zustand domain stores, TanStack Query sync, offline queue scaffold, and atomic `resetAllStores()` logout wipe
- Docs: `docs/REALTIME_ARCHITECTURE.md` event matrix and security notes

### Changed

- Display clock times in 12-hour AM/PM across web/mobile timelines, reports, and rate period strings; show timesheet `code` (not `#id`) in lists, details, reports, payouts, and PDFs
- Reports: no auto-email on generate; **Email Report** sends summary + PDF attachment; currency prefixes (`$AUD`, `₹INR`, …) and `h` hour suffixes on amounts/hours; day sheet **Rate** button shows live day payable breakdown without generating a report
- Reports currency now always comes from the employee wage (e.g. Pritth → `₹INR`); older saved reports are corrected on load when the stored currency was wrong
- Reports UX: single employee + mandatory approved timesheet only (removed multi-select, date presets, status filter, and Rate analysis tab); result shows day/work/amount, pay-cycle total, and paid/not paid; PDF download + email endpoints; employee lists mark the current user as `(You)`

### Fixed

- Duplicate employees in list/dropdowns/reports: root cause was duplicate `user_organisation_roles` rows for the same `(user_id, organisation_id)`, multiplied by an unscoped `hasOne` join on `user_id` in the Employees defaultScope
- Deduped existing UOR/employee rows and added unique indexes on `(user_id, organisation_id)` for both tables
- Scoped UOR includes to the employee/org context; invite accept now updates an existing role instead of always inserting
- Org bootstrap (`Employees.organisation_id` unknown in ON clause): stop joining UOR inside Employees defaultScope; attach the org-scoped role in `afterFind` so nested `employee` aliases work

### Changed

- Organisation create now seeds a starter holiday calendar and creates the owner employee with wage + payroll linked to the default payroll calendar (setup-complete for operational workflows)
- Added `npm run demo:reset-seed` to wipe app data (keeping lookup seeders) and rebuild a full Siliguri demo org; `npm test` runs node:test suites for signup + ACL
- Reports Phase 1: async Hours & Activity reports via BullMQ (`report_requests` + worker), role-ladder employee scope, in-app + email notify on complete; Rate analysis kept as secondary tab; `report.create` ACL for all org roles

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
- Payroll calendars: multiple allowed per organisation; create enabled; existing calendars are view-only (updates rejected by API); new organisations still receive a default calendar
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
