# myTask — Timesheet Management Monorepo

Cross-platform rebuild of **myTask** (time tracking and working log app).

| Area | Stack |
|------|--------|
| `backend/` | Express + Sequelize + MySQL + Firebase Auth + Socket.IO + Redis/BullMQ |
| `web/` | React + Vite + TypeScript + TanStack Query + Zustand + Tailwind |
| `mobile/` | React Native CLI + TypeScript + React Navigation |
| `packages/` | Shared API client, types, validation, auth logic, constants, theme |

The original Vue/Quasar source was lost. The production build lives in `origianl-frontend-vue-js/` (folder name is misspelled) and was reverse-engineered to drive this rebuild.

---

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | ≥ 20 (backend and workspaces). Mobile RN 0.86 prefers ≥ 20; some tooling suggests ≥ 22. |
| npm | ≥ 8 (use `--legacy-peer-deps` for workspace install) |
| MySQL | Required for backend |
| Redis | Required if workers / org cache are enabled |
| Xcode | macOS only — iOS Simulator / device builds |
| CocoaPods | iOS native deps (`bundle exec pod install`) |
| Android Studio | Android SDK, emulator or USB device |
| JDK | 17 recommended for Android Gradle builds |
| Firebase project | Web + mobile clients need Auth (email/password) |

---

## 1. Install monorepo dependencies (web + mobile + packages)

From the **repository root**:

```bash
cd /path/to/timesheet-management
npm install --legacy-peer-deps
```

This installs `web/`, `mobile/`, and `packages/*` via npm workspaces.

`backend/` has its **own** `package.json` — install it separately (see Backend section).

---

## 2. Backend (API server)

### 2.1 Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set at least:

- `APP_HOST_PORT` — default `8080`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_DIALECT=mysql`
- `FIREBASE_API_KEY` (+ `FIREBASE_API_URL` if not using the example)
- `CLIENT_URL` — e.g. `http://localhost:9000/` for local web
- `REDIS_HOST` — e.g. `127.0.0.1` if Redis is running
- Mail / secrets as needed for the features you use

Ensure Firebase service account JSON is present as configured by the backend (`serviceAccountKey.json` or env-specific files already in the repo for your environments).

### 2.2 Install and start Redis (if using cache/workers)

```bash
# macOS (Homebrew example)
brew install redis
brew services start redis
redis-cli ping   # should print PONG
```

### 2.3 Install backend packages and run migrations (as needed)

```bash
cd backend
npm install

# Optional — run migrations / seeders when setting up a fresh DB
npm run migrate:all
# npm run seed:all
```

### 2.4 Start the API

```bash
cd backend
npm start
# or with file watch (npm-watch):
npm run dev
```

Server listens on `http://0.0.0.0:8080` by default. API base path: **`http://localhost:8080/api`**.

Health check idea: open or curl a known public route, or hit your login flow from the clients.

Optional workers (queues): controlled by `RUN_WORKERS` in `.env`. Separate PM2 processes are documented in `backend/readme.md`.

More detail: [`backend/docs/ENVIRONMENT.md`](./backend/docs/ENVIRONMENT.md), [`backend/docs/API_REFERENCE.md`](./backend/docs/API_REFERENCE.md).

---

## 3. Web app (React + Vite) — development

### 3.1 Configure environment

```bash
cd web
cp .env.example .env
```

Edit `web/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Firebase values must match the same Firebase project the backend verifies against.

### 3.2 Start the dev server

From the **repo root** (after workspace install):

```bash
npm run web
# equivalent:
npm run dev -w web
```

Or from `web/`:

```bash
cd web
npm run dev
```

- **URL:** [http://localhost:9000](http://localhost:9000)  
- Hot Module Replacement is enabled via Vite.

### 3.3 Production build (optional)

```bash
npm run build -w web
# output: web/dist/
npm run preview -w web   # preview the build
```

More detail: [`web/docs/BUILD.md`](./web/docs/BUILD.md), [`web/README.md`](./web/README.md).

---

## 4. Mobile app (React Native CLI) — development

Mobile is a **bare React Native CLI** project (`mobile/ios`, `mobile/android`).

### 4.1 Configure API + Firebase

Edit:

```text
mobile/src/config/env.ts
```

Set:

- `API_BASE_URL` — use your machine LAN IP for a physical device, e.g. `http://192.168.x.x:8080/api` (Android emulator often uses `http://10.0.2.2:8080/api` to reach the host machine’s localhost)
- All `FIREBASE_*` fields for the same Firebase project

### 4.2 One-time / after native dependency changes

From repo root (workspaces already installed):

```bash
cd mobile
```

**iOS (macOS only):**

```bash
bundle install
bundle exec pod install --project-directory=ios
# or:
npm run pods
```

**Android:** open the project once in Android Studio so SDK / licenses / emulator images are installed. Ensure `ANDROID_HOME` is set.

### 4.3 Start Metro bundler

From repo root:

```bash
npm run mobile
# equivalent:
npm start -w mobile
```

Or:

```bash
cd mobile
npm start
```

Keep this terminal running.

### 4.4 Run on iOS (Simulator or device)

**Requires:** macOS, Xcode, CocoaPods installed, pods installed.

In a **second** terminal:

```bash
npm run mobile:ios
# equivalent:
npm run ios -w mobile
```

Or:

```bash
cd mobile
npm run ios
```

Optional device / simulator flags (React Native CLI):

```bash
cd mobile
npx react-native run-ios --simulator="iPhone 16"
npx react-native run-ios --device
```

You can also open `mobile/ios/MyTaskMobile.xcworkspace` in Xcode (after `pod install`) and press Run.
(Xcode project / scheme name is **MyTaskMobile**; display name and bundle ID are **myTask** / `com.mytask.app`.)

### 4.5 Run on Android (Emulator or device)

**Requires:** Android Studio, SDK, emulator running **or** USB device with USB debugging enabled.

Start an emulator from Android Studio (Device Manager), then:

```bash
npm run mobile:android
# equivalent:
npm run android -w mobile
```

Or:

```bash
cd mobile
npm run android
```

Check the device is visible:

```bash
adb devices
```

If Metro cannot reach the device, shake the device / open Dev Menu and set the bundler host, or:

```bash
adb reverse tcp:8081 tcp:8081
```

For API calls from the **Android emulator** to a backend on your Mac/PC, prefer:

```ts
API_BASE_URL: 'http://10.0.2.2:8080/api'
```

in `mobile/src/config/env.ts`.

More detail: [`mobile/README.md`](./mobile/README.md), [`mobile/docs/BUILD.md`](./mobile/docs/BUILD.md).

---

## 5. Typical local full-stack session

Open **three terminals**:

```bash
# Terminal 1 — API
cd backend && npm start

# Terminal 2 — Web
npm run web

# Terminal 3 — Mobile Metro (+ run ios/android in a 4th terminal or IDE)
npm run mobile
npm run mobile:ios      # or mobile:android
```

Auth flow: Firebase email/password on the client → ID token → `POST /api/auth/login` on the backend.

---

## Documentation map

### Root

| Doc | Purpose |
|-----|---------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Product & domain |
| [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) | Monorepo architecture |
| [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) | Auth, org context, ACL |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased delivery |
| [API_ANALYSIS.md](./API_ANALYSIS.md) | Complete API map |
| [BACKEND_ANALYSIS.md](./BACKEND_ANALYSIS.md) | Backend deep dive |
| [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) | Vue build recovery |
| [ROUTE_ANALYSIS.md](./ROUTE_ANALYSIS.md) | Frontend route map |
| [MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md) | Milestone tracker |
| [RECOVERY_NOTES.md](./RECOVERY_NOTES.md) | Gaps & assumptions |
| [docs/](./docs/) | Root developer docs index |

### Per package

| Folder | Docs | Cursor rules |
|--------|------|--------------|
| Root | `docs/` | `.cursor/rules/` |
| Backend | `backend/docs/` | `backend/.cursor/rules/` |
| Web | `web/docs/` | `web/.cursor/rules/` |
| Mobile | `mobile/docs/` | `mobile/.cursor/rules/` |

---

## Product URLs (reference)

- Client Server: `https://mytaskapp.iampapaisarkar.com/`
- Dev API : `https://mytaskapi.iampapaisarkar.com.au/api`

> Product branding is **myTask**. Legacy hostnames above are infrastructure / historical references from the original deployment.
