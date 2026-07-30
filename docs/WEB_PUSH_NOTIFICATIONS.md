# Web Firebase Cloud Messaging (FCM)

## Prerequisites

1. Firebase project shared with backend (`FIREBASE_API_KEY` / Admin SDK).
2. Web app registered in Firebase Console → Project settings → Your apps.
3. Cloud Messaging enabled.
4. Web Push certificate (VAPID key) generated under Cloud Messaging → Web Push certificates.

## Environment variables (`web/.env`)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=   # Web Push certificate key pair
VITE_API_BASE_URL=http://localhost:8080/api
```

Never commit real secrets. The web Firebase config is public client config; the VAPID key is also client-safe but still belongs in env.

## Service worker

File: `web/public/firebase-messaging-sw.js`

- Registered by `registerServiceWorker()` in `web/src/lib/webPush.ts`
- Receives Firebase config via `postMessage({ type: "SET_FIREBASE_CONFIG", config })` and caches it
- Handles background messages + `notificationclick` (focus existing tab or open window, then navigate)

## Token lifecycle

1. User signs in → `WebPushProvider` calls `registerWebPush()`
2. Browser permission requested
3. FCM token obtained with VAPID key + SW registration
4. Token saved via `POST /api/auth/update-fcm-token` (`platform: "web"`)
5. Stored locally under `mytask.fcmToken`
6. On logout → `deleteToken` + clear local storage (via `useLogout`)

## Foreground vs background

| State | Behaviour |
| --- | --- |
| App focused | `onMessage` → toast (title/body/icon) → click navigates via `resolveNotificationPath` |
| Background / other tab | Browser notification from SW → click focuses app + navigates |

## Notification routing

Shared helper: `@mytask/services` → `resolveNotificationPath`

- Parses `url` / FCM `data.url`
- Normalises legacy paths (e.g. `/timesheets` → `/timesheet`)
- Infers destination from title/body when URL missing
- Falls back safely without hardcoding a single feature route

## Local development

1. HTTPS or `http://localhost` required for Notification API
2. Copy `web/.env.example` → `web/.env` and fill values
3. `npm run web`
4. Allow notifications when prompted
5. Confirm SW at DevTools → Application → Service Workers (`firebase-messaging-sw.js`)

## Production

1. Serve the app over HTTPS
2. Restrict Firebase web API key by HTTP referrer in Google Cloud
3. Ensure `CLIENT_URL` on backend matches the deployed web origin (email + deep links)
4. Redeploy after changing VAPID or Firebase project IDs (SW cache may need a hard refresh once)
