# Firebase Google Sign-In

Production Google Sign-In for **web** (Vite React) and **mobile** (React Native CLI).  
This monorepo does **not** use React Native Web — platforms are separate apps sharing `@mytask/*` and Firebase.

## Architecture

```
Native Google / Web Google popup
        │
        ▼
Firebase Auth (ID token + built-in persistence + auto refresh)
        │
        ▼
@mytask/auth TokenManager → Bearer on API / sockets
        │
        ▼
POST /api/auth/login  (backend verifies Admin + links firebase_providers)
```

- **Do not** store or refresh ID tokens yourself. Use Firebase `getIdToken()` / `onIdTokenChanged` via TokenManager.
- **Web persistence:** Firebase IndexedDB / local (default `getAuth`).
- **Mobile persistence:** Firebase `getReactNativePersistence(AsyncStorage)` — official RN persistence, not a custom session layer.
- Profile mirror in Zustand / AsyncStorage is **app profile cache**, not the auth session source of truth.

## npm packages

| App | Package | Purpose |
|-----|---------|---------|
| web | `firebase` (already present) | Auth popup / redirect |
| mobile | `firebase` (already present) | Auth + RN persistence |
| mobile | `@react-native-google-signin/google-signin` | Native Google Sign-In |

```bash
# from repo root / mobile workspace
npm install @react-native-google-signin/google-signin --workspace=mobile
cd mobile/ios && bundle exec pod install
```

## Environment variables

### Web (`web/.env`)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Mobile (`mobile/src/config/env.ts`)

```ts
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
GOOGLE_WEB_CLIENT_ID   // Web OAuth client — required for ID token
GOOGLE_IOS_CLIENT_ID   // optional if GoogleService-Info.plist is present
```

## Auth service API

| Method | Web | Mobile |
|--------|-----|--------|
| `signInWithGoogle()` | Popup → redirect fallback | Native Google → `signInWithCredential` |
| `signOutUser()` / `signOut()` | Firebase `signOut` | Firebase + `GoogleSignin.signOut` |
| `getCurrentUser()` | Firebase current user | same |
| `onAuthStateChangedListener()` | Firebase listener | same |
| `getIdToken(force?)` | Firebase | same |

Paths:

- `web/src/services/firebase/`
- `mobile/src/services/firebase/`

## Firebase Console steps (required)

1. **Authentication → Sign-in method → Google → Enable**
2. Add **Web**, **Android** (`com.mytask.imps.app`), and **iOS** (`com.mytask.imps.app`) apps under Project settings.
   If you previously registered `com.mytask.app`, add **new** Android/iOS apps with the updated bundle ID and re-download `google-services.json` / `GoogleService-Info.plist`.
3. **Android:** add SHA-1 and SHA-256 (debug + release). Download `google-services.json` → `mobile/android/app/google-services.json`.
4. **iOS:** download `GoogleService-Info.plist` → `mobile/ios/GoogleService-Info.plist` (and add to Xcode target). Copy `REVERSED_CLIENT_ID` into `Info.plist` → `CFBundleURLSchemes`.
5. **Authorized domains** (Web): add `localhost`, production host, staging host.
6. Copy **Web client ID** (Google provider settings / Cloud Console OAuth “Web client”) into `GOOGLE_WEB_CLIENT_ID`.
7. Ensure Support email is set on the Firebase project.

### SHA-1 / SHA-256 (Android debug)

```bash
cd mobile/android
./gradlew signingReport
# Add both SHA-1 and SHA-256 for the debug (and later release) keystore in Firebase.
```

## Platform notes

### Android

- `google-services` Gradle plugin applied in `android/build.gradle` + `android/app/build.gradle`.
- Replace placeholder `google-services.json` with the Firebase download.
- Rebuild after adding the native module: `npm run android`.

### iOS

- Add `GoogleService-Info.plist` to the Xcode project (Copy Bundle Resources).
- Set URL Types → Reversed Client ID (already stubbed in `Info.plist`).
- `cd mobile && npm run pods` then `npm run ios`.

### Web

- No extra npm packages beyond `firebase`.
- Popup is default; blocked popups fall back to `signInWithRedirect` + `getRedirectResult` on Login.

## Backend behaviour

`POST /api/auth/login` still requires an existing myTask user (email match with Firebase token).

On success it **links** the Firebase UID into `firebase_providers` (so Google UIDs resolve on subsequent `TokenValidate`).

If the email has no local user → `404` / `AUTH_USER_NOT_FOUND` (sign up with email first, then Google Sign-In works for that email once a Firebase Google user exists for it).

> Tip: In Firebase, enable “one account per email” so Google and password can link for the same email when appropriate.

## Verification checklist

1. **Google Sign-In (web):** Login → Continue with Google → account picker → lands in authenticated app.
2. **Google Sign-In (Android / iOS):** same; confirm native account sheet.
3. **Persistence:** kill app / hard-refresh browser → still authenticated (Firebase restores; TokenManager waits until ready).
4. **Token refresh:** stay signed in > 1 hour; network tab / API calls still succeed (TokenManager + `getIdToken` — no forced re-login).
5. **Logout:** Profile / layout Logout → Firebase (+ Google on native) cleared → Login screen; restart stays logged out.
6. **Cancel:** dismiss Google sheet / close popup → friendly message, no crash.
7. **Unknown user:** Google account with no myTask user → clear “sign up first” message.

## Related docs

- [`docs/AUTH_ARCHITECTURE.md`](./AUTH_ARCHITECTURE.md)
- [`backend/docs/AUTHENTICATION.md`](../backend/docs/AUTHENTICATION.md)
- [`mobile/docs/DEPLOYMENT.md`](../mobile/docs/DEPLOYMENT.md)
