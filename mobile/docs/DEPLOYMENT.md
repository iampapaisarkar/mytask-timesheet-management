# Mobile Deployment

Use standard React Native release flows:

- **Android:** `cd android && ./gradlew assembleRelease` (or App Bundle)
- **iOS:** Archive via Xcode (`MyTaskMobile.xcworkspace`)

Configure signing, Firebase configs (`GoogleService-Info.plist` / `google-services.json`), Google Sign-In (SHA fingerprints, reversed client ID URL scheme), and deep links (assetlinks / AASA) before store submission.

Local secrets: copy `src/config/env.local.ts.example` → `src/config/env.local.ts` (gitignored).

See [`docs/GOOGLE_SIGN_IN.md`](../../docs/GOOGLE_SIGN_IN.md) for the full Google Sign-In checklist.

## Deep links (web + mobile)

Production host: **`https://mytaskapp.iampapaisarkar.dev`**

Email and product links use this HTTPS origin. On desktop they open the web app; on mobile with the native app installed they should open the app via Universal Links (iOS) / App Links (Android). Custom scheme `mytask://` remains as a fallback.

### Host files (served by web)

Deployed from `web/public/.well-known/`:

- `apple-app-site-association` (no file extension; `Content-Type: application/json`)
- `assetlinks.json`

### Android

1. Replace `REPLACE_WITH_DEBUG_OR_RELEASE_SHA256` in `assetlinks.json` with the signing cert SHA-256:

```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

2. Confirm `AndroidManifest.xml` has the `https` intent-filter for `mytaskapp.iampapaisarkar.dev` with `android:autoVerify="true"`.

### iOS

1. Associated Domains entitlement: `applinks:mytaskapp.iampapaisarkar.dev` (`MyTaskMobile.entitlements`).
2. Confirm Team ID in AASA `appID` (`TEAMID.com.mytask.imps.app`) matches Apple Developer.
3. After deploy, verify: `https://mytaskapp.iampapaisarkar.dev/.well-known/apple-app-site-association`
