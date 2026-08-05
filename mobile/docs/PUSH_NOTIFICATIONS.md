# Mobile push notifications (FCM)

Android (and iOS when APNs is configured) register device tokens with the same
backend endpoint as web: `POST /api/auth/update-fcm-token`.

## Packages

- `@react-native-firebase/app`
- `@react-native-firebase/messaging`

Native config:

- Android: `mobile/android/app/google-services.json` + `google-services` Gradle plugin
- iOS: `GoogleService-Info.plist` + `npm run pods -w mobile`

## Token lifecycle

1. User signs in → `PushNotificationsProvider` calls `registerMobilePush()`
2. Runtime permission (`POST_NOTIFICATIONS` on Android 13+)
3. `getToken(getMessaging())` → upsert via `authApi.updateFcmToken` (`platform: "android"` | `"ios"`)
   (RNFirebase v26 modular API — namespaced `messaging()` was removed)
4. Local cache under `mytask.fcmToken`
5. Token refresh listener keeps backend in sync
6. Logout → `unregisterMobilePush()` (deleteToken + clear local cache)

## Display behaviour

| App state | Behaviour |
| --- | --- |
| Foreground | In-app toast (`toast.info`) |
| Background / killed | OS notification tray (FCM `notification` payload) |
| Tap notification | `resolveNotificationPath` → `navigateNotificationPath` |

Default Android channel: `mytask_default` (created in `MainApplication`).

## Verify

1. Rebuild native app after installing packages (`npx react-native run-android`)
2. Sign in and allow notifications
3. Confirm Metro log: `[FCM] Token registered android`
4. Confirm Network: `POST /auth/update-fcm-token`
5. Confirm DB row in `fcm_connections` for the user
6. Trigger a notification from the app / `GET /api/firebase-notification-test` (dev)

Use an emulator **with Google Play**. Emulators without Play Services cannot receive FCM.
