# Mobile (React Native CLI)

Bare React Native application. Native projects: `ios/` and `android/`.

## Setup

```bash
# from monorepo root
npm install --legacy-peer-deps

cd mobile
# iOS pods (macOS)
bundle install
bundle exec pod install --project-directory=ios

# configure Firebase + API in:
# src/config/env.ts
```

## Run

```bash
npm start -w mobile          # Metro
npm run ios -w mobile        # iOS simulator / device
npm run android -w mobile    # Android emulator / device
```

## Stack

- React Native CLI 0.86
- React Navigation
- TanStack Query + Zustand
- Shared `@mysheet/*` packages
- AsyncStorage for session persistence

See `docs/` for architecture, navigation, and deployment.
