# Mobile Build & Run

## Metro

```bash
npm start -w mobile
# or: cd mobile && npm start
```

## iOS

Prerequisites: macOS, Xcode, CocoaPods.

```bash
cd mobile
bundle install
bundle exec pod install --project-directory=ios
npm run ios
```

Simulator example:

```bash
npx react-native run-ios --simulator="iPhone 16"
```

## Android

Prerequisites: Android Studio, SDK, emulator or USB device (`adb devices`).

```bash
cd mobile
npm run android
```

Android emulator → host machine API:

```ts
// src/config/env.ts
API_BASE_URL: 'http://10.0.2.2:8080/api'
```

Physical device → use your computer’s LAN IP:

```ts
API_BASE_URL: 'http://192.168.x.x:8080/api'
```

Metro port forwarding (device):

```bash
adb reverse tcp:8081 tcp:8081
```

## Native deps

After adding native modules:

```bash
cd mobile && npm run pods
# then rebuild ios/android
```
