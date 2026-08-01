# Mobile Build & Run

## Metro

```bash
npm start -w mobile
# or: cd mobile && npm start
```

## iOS

Prerequisites: macOS, Xcode, CocoaPods.

```bash
cd mobile/ios
pod install
# Prefer: open MyTaskMobile.xcworkspace (not .xcodeproj)
```

### Real iPhone

1. Connect device, trust the computer.
2. In Xcode → Signing & Capabilities: select your Team for `MyTaskMobile`.
3. Ensure `GoogleService-Info.plist` is in the app target (Copy Bundle Resources).
4. Start Metro, then run:

```bash
cd mobile
npm start
# other terminal:
npx react-native run-ios --device
```

Physical device API host must be your Mac LAN IP (already in `src/config/env.ts`):

```ts
API_BASE_URL: 'http://192.168.x.x:3002/api'
```

## Android

Prerequisites: Android Studio, SDK, emulator or USB device (`adb devices`).

Monorepo Gradle paths point at the **workspace root** `node_modules`.

```bash
cd mobile
npm run android
```

### Real Android device

```bash
adb devices
adb reverse tcp:8081 tcp:8081   # Metro
# API: use LAN IP in env.ts (not 10.0.2.2)
npm run android
```

Add debug **SHA-1 / SHA-256** in Firebase for Google Sign-In:

```bash
cd mobile/android && ./gradlew signingReport
```

Android emulator → host machine API:

```ts
// src/config/env.ts
API_BASE_URL: 'http://10.0.2.2:3002/api'
```

Physical device → use your computer’s LAN IP in `src/config/env.local.ts`:

```ts
API_BASE_URL: 'http://192.168.x.x:3002/api'
```

## Native deps

After adding native modules:

```bash
cd mobile/ios && pod install
# then rebuild ios/android
```

Installed native Google Sign-In pods include `RNGoogleSignin` / `GoogleSignIn`.

## Google Maps (required on iOS + Android)

The app uses **Google Maps only** (`PROVIDER_GOOGLE`) — not Apple Maps.

1. Enable **Maps SDK for iOS** and **Maps SDK for Android** in Google Cloud Console.
2. Create a Maps API key and set it in three places:
   - `mobile/src/config/env.local.ts` → `GOOGLE_MAPS_API_KEY`
   - `mobile/ios/MyTaskMobile/Info.plist` → `GMSApiKey`
   - `mobile/android/app/src/main/res/values/strings.xml` → `google_maps_api_key`
3. Re-run pods so the Google Maps subspec is linked:

```bash
cd mobile/ios && pod install
```

`AppDelegate.swift` calls `GMSServices.provideAPIKey` from `GMSApiKey`.
Maps use a minimal custom style (`mobile/src/components/mapStyle.ts`).

**New Architecture note:** `react-native-maps` must remain autolinked on iOS so Fabric
registers `RNMapsGoogleMapView`. The Podfile still adds `react-native-maps/Google`
(same relative path) for the Google Maps SDK. Do not set `ios: null` for maps in
`react-native.config.js` — that causes `Unimplemented component <RNMapsGoogleMapView>`.
