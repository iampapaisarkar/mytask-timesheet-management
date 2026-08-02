# Location tracking

Clock-in uses `react-native-background-geolocation` (Transistorsoft) with the
official HTTP autoSync path. UI entry: floating center FAB on the org tab bar →
full-screen `TrackingScreen`.

## Architecture

| Layer | Role |
|-------|------|
| `TrackingScreen` | Start / Pause / Resume / Stop, timer, activity status |
| `hooks/useTracking` | Validate, session, API store/list, BGL lifecycle |
| `trackingAuthToken.ts` | Persist / ensure durable `mttrk_…` tracking token |
| `trackingSession.ts` | Persist org + user for cross-org lock + BGL params |
| `backgroundGeolocation.ts` | Transistorsoft ready/start/stop/setConfig |
| `backgroundGeolocationHeadless.ts` | Terminated-state headless registration |
| Backend `timesheet-activity` | Geofence → Travel / Working / Break; day tasks |

## Auth (durable tracking token)

Firebase ID tokens expire (~1h) and cannot be refreshed when the app is
**terminated**. Location APIs therefore use a **backend-issued opaque tracking
token** (`mttrk_…`), separate from Firebase session auth used by the rest of
the app.

| Step | Detail |
|------|--------|
| Issue | Mobile login / signup with `platform: ios\|android` returns `tracking_token` once |
| Persist | AsyncStorage `STORAGE_KEYS.trackingToken` (+ expiry) |
| Refresh | Foreground: `POST /auth/tracking-token` (Firebase `TokenValidate`) if missing / near expiry |
| Use | BGL HTTP + `POST /timesheet-activity/store` → `Authorization: Bearer mttrk_…` |
| Revoke | Logout → `POST /auth/logout` (+ clear local keys) |

`POST /timesheet-activity/store` and `POST /timesheet-activity/send-location`
accept **only** the tracking token (`TrackingTokenValidate`). They do **not**
use FCM identity or Firebase ID tokens.

Other APIs (timesheets, orgs, validate, activity list) still use Firebase
`TokenValidate`.

Keychain storage is a follow-up; AsyncStorage is used for now.

## Native setup (required)

### 1. CocoaPods (iOS)

`RNBackgroundGeolocation` depends on public CocoaPod **`TSLocationManager`**
(on [cdn.cocoapods.org](https://cdn.cocoapods.org/)). Your Podfile already
declares that source.

If `pod install` fails with *None of your spec sources contain TSLocationManager*:

```bash
cd mobile
npm run pods
# equivalent: cd ios && pod install --repo-update
```

`--repo-update` refreshes the CocoaPods CDN so `TSLocationManager ~> 4.4` resolves.

### 2. License keys

- **DEBUG** builds work without a license.
- **RELEASE** Android (and App Store iOS) need a **v5** JWT from the
  [Transistorsoft customer dashboard](https://www.transistorsoft.com).

| Platform | Where |
|----------|--------|
| iOS | `Info.plist` → `TSLocationManagerLicense` |
| Android | `AndroidManifest.xml` → `com.transistorsoft.locationmanager.license` |

Replace `YOUR_*_LICENSE_KEY_JWT` placeholders before shipping release builds.

### 3. Already wired in this repo

- Autolinking enabled (`react-native.config.js`)
- `AppDelegate` → `TSBackgroundFetch.sharedInstance().didFinishLaunching()`
- Info.plist: Always location, motion, `UIBackgroundModes`, `BGTaskSchedulerPermittedIdentifiers`
- Android: location + foreground-service permissions + license meta-data slot
- Headless JS registration in `mobile/index.js`

### 4. Rebuild

```bash
cd mobile
npm run pods
npx react-native run-ios
# or
npx react-native run-android
```

## Plugin config (battery-aware)

- `distanceFilter: 20`, `stationaryRadius: 25`, `stopTimeout: 5`
- `heartbeatInterval: 60`, `preventSuspend: true`
- `stopOnTerminate: false`, `startOnBoot: true`, `enableHeadless: true`
- `autoSync: true` → `POST {API}/timesheet-activity/send-location`
- headers: `Authorization: Bearer <tracking_token>`
- params: `organisationCode`, `userId` (org scoping; auth is the tracking token)

Manual actions (`start` / `pause` / `resume` / `stop`) use
`POST /timesheet-activity/store` with the same tracking Bearer and current GPS
fix so the backend can decide activity immediately.

## Start gates

1. Draft timesheet covering today (`GET /timesheet-activity/validate` — Firebase)
2. At least one assigned job on that timesheet (`timesheet_jobs`)
3. No active tracker in another organisation (client + server)
4. Durable tracking token present (issue / refresh if needed)
5. Always / background location permission
6. Native BGL module linked

Applies to **all roles including owner**.

## Pause remarks

Optional remarks on pause are stored on the auto-created break
`timesheet_day_tasks.remarks`.

## Live map / timeline / tables

While a timesheet day is open (web or mobile), org members receive
`tracking.updated` over Socket.IO and TanStack Query refetches
`screens/timesheet-day-editor`. The Tracking map, Tracked timeline, and
`tracking_logs` update without a manual refresh. Requires Redis (Socket.IO
adapter + worker redis-emitter) and an active org room join.
