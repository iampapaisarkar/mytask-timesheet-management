# Mobile Architecture

React Native CLI bare app sharing business logic via `@mysheet/*` packages.

```
mobile/
  android/          # Native Android
  ios/              # Native iOS
  App.tsx
  src/
    config/         # ENV (API + Firebase)
    navigation/
    screens/
    store/
  docs/
  .cursor/rules/
```

Metro is configured for the monorepo (`watchFolders` + workspace `node_modules`).
