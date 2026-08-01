# Mobile Deployment

Use standard React Native release flows:

- **Android:** `cd android && ./gradlew assembleRelease` (or App Bundle)
- **iOS:** Archive via Xcode (`MyTaskMobile.xcworkspace`)

Configure signing, Firebase configs (`GoogleService-Info.plist` / `google-services.json`), Google Sign-In (SHA fingerprints, reversed client ID URL scheme), and deep links (assetlinks / AASA) before store submission.

See [`docs/GOOGLE_SIGN_IN.md`](../../docs/GOOGLE_SIGN_IN.md) for the full Google Sign-In checklist.
