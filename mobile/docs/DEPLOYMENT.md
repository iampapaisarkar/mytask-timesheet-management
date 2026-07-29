# Mobile Deployment

Use standard React Native release flows:

- **Android:** `cd android && ./gradlew assembleRelease` (or App Bundle)
- **iOS:** Archive via Xcode (`MyTaskMobile.xcworkspace`)

Configure signing, Firebase configs (`GoogleService-Info.plist` / `google-services.json`), and deep links (assetlinks / AASA) before store submission.
