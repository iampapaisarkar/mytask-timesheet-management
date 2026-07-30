# QA Verification Report — Logout, Org Switcher, Notifications, FCM, Legal

**Date:** 2026-07-30  
**Scope:** Org logout, Back to myTask, notification routing, web FCM, disclaimer removal, Help/Terms

## Files changed (high level)

### Shared packages
- `packages/constants` — `ROUTES.help|terms|privacy|settingsHelp|settingsTerms`
- `packages/services` — `resolveNotificationPath` (+ constants dependency)

### Backend
- `backend/class/firebase-messaging.js` — always send FCM `data.url|title|body`
- `backend/service/employee.service.js` — invitation notification URL + email slash fix

### Web
- `OrgLayout` — Logout (shared `useLogout`)
- `OrganisationSwitcher` — Back to myTask
- `NotificationsBell` — SPA navigate via routing service
- `web/src/lib/webPush.ts`, `WebPushProvider`, `public/firebase-messaging-sw.js`
- Legal pages + Auth/Settings links
- Removed `ShowcaseNotice` disclaimer

### Mobile
- Removed showcase disclaimer from `LoginScreen`

### Docs
- `docs/WEB_PUSH_NOTIFICATIONS.md`
- `docs/REALTIME_ARCHITECTURE.md` (pre-existing)
- This report

## Backend updates
- Invitation push now includes `/org-invitation?token=…`
- FCM data payload always includes navigable `url` for SW/click handlers
- Email invitation `button_url` includes `/` before `org-invitation`

## Frontend updates
- Single logout path: `useLogout` → API logout → unregister push → Firebase sign-out → `resetAllStores` → login
- Org header Logout mirrors MainLayout
- Org dropdown Back to myTask clears org context + org bootstrap caches, navigates home (no full reload)
- Notification clicks use React Router + centralized path resolver (fixes catch-all → `/` from bad/legacy URLs)
- Web FCM registration, foreground toasts, background SW notifications
- Help/FAQ, Terms, Privacy public routes; Settings entries for Help/Terms

## Notification flow
1. Backend creates DB row + socket `notification.created` + optional FCM
2. Bell / socket invalidate list
3. Click → `resolveNotificationPath` → `navigate(path)`
4. FCM foreground → toast with onClick navigation
5. FCM background → SW notification → focus/open → `NOTIFICATION_NAVIGATE`

## Testing performed
- `npm run typecheck -w @mytask/services -w web` (run in session)
- Static review of routes, logout wipe, SW registration paths
- Grep confirmed disclaimer removed from app sources

## Manual QA checklist (run in browser)
- [ ] Org header Logout clears session and lands on `/login`
- [ ] Re-login shows no previous org caches
- [ ] Inside org: switcher shows **Back to myTask** → home without refresh
- [ ] Timesheet notification opens timesheet (self or management) details
- [ ] Report-ready notification opens `/org/:code/reports?request=…`
- [ ] Invitation notification opens `/org-invitation?token=…`
- [ ] Allow notifications → token stored (Network: `update-fcm-token`)
- [ ] Foreground toast appears and navigates on click
- [ ] Background notification click focuses tab and navigates
- [ ] Unsupported browser / missing VAPID fails gracefully (no crash)
- [ ] Auth footer links: Help, Terms, Privacy
- [ ] Settings → Help & FAQ / Terms & Conditions render in-app

## Remaining recommendations
1. Add Playwright E2E for notification click + org leave/logout
2. Wire mobile FCM similarly using the same `resolveNotificationPath`
3. Consider deleting remote FCM tokens on logout via a dedicated API when session is still valid
4. Migrate legal copy to CMS/API later using the existing content layout components
