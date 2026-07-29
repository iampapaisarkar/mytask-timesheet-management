# Location tracking (Phase 5)

Clock-in / clock-out uses `mobile/src/services/backgroundGeolocation.ts`, which mirrors the Vue `$BGL` API (`setup`, `destroy`, `start`, `stop`, `sync`, `setConfig`, `getCurrentPosition`, `requestPermissions`, `setGeofences`).

## Runtime modes

1. **Native Transistorsoft** — when `react-native-background-geolocation` is installed **and** native-linked, Vue-parity config is used:
   - `distanceFilter: 10`, `heartbeatInterval: 60`, `preventSuspend: true`
   - `stopOnTerminate: false`, `startOnBoot: true`, `enableHeadless: true`
   - `autoSync: true`, `maxDaysToPersist: 14`
   - HTTP: `{API_BASE_URL}/timesheet-activity/send-location`
   - params: `organisationCode`, `userId`, `fcmToken`

2. **Fallback (default for compile)** — `@react-native-community/geolocation` + a 60s interval that POSTs via `timesheetActivityApi.sendLocation`. No Transistorsoft license required.

Native linking for `react-native-background-geolocation` is **disabled** in `mobile/react-native.config.js` so iOS/Android builds do not need the private `TSLocationManager` CocoaPods source or a paid license. DEBUG Transistorsoft builds do not need a license once linked; RELEASE Android does.

## Enable native Background Geolocation

1. Remove (or comment out) the `react-native-background-geolocation` block in `mobile/react-native.config.js`.
2. Follow [Transistorsoft RN setup](https://docs.transistorsoft.com/react-native/setup/) (CocoaPods repo + Android maven).
3. Add a v5 license key for RELEASE Android builds.
4. `npm run pods` and rebuild the native app.

## Session + UI

- `trackingSession.ts` persists `trackingOrganisationCode` / `trackingUserId` in AsyncStorage.
- `ClockInOut` validates (`timesheetActivityApi.validate`), stores `start|pause|resume|stop` with location, then starts/stops BGL.
- Org switch / logout are blocked while tracking another org (Home + Profile).

## Permissions

- iOS `Info.plist`: WhenInUse, Always, AlwaysAndWhenInUse usage strings.
- Android `AndroidManifest.xml`: fine/coarse/background location + foreground service.
