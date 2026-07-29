# Project Architecture

## Monorepo layout

```
timesheet-management/
├── backend/                 # Existing Express API (unchanged behaviour)
├── web/                     # React + Vite SPA
├── mobile/                  # React Native CLI (bare ios/android)
├── packages/
│   ├── api/                 # Axios client, interceptors, endpoint modules
│   ├── hooks/               # Shared TanStack Query hooks (platform-agnostic)
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Pure helpers
│   ├── validation/          # Zod schemas
│   ├── constants/           # Routes, ACL keys, status enums
│   ├── services/            # Auth session, org context, ACL helpers
│   └── theme/               # Shared colour tokens / typography scales
├── origianl-frontend-vue-js/# Reference production build (do not ship)
└── docs at repo root        # Analysis & migration docs
```

## Workspace model

npm workspaces at root:

```json
{
  "private": true,
  "workspaces": ["web", "mobile", "packages/*"]
}
```

`backend/` remains independent (existing `package.json`, ESM).

## Dependency direction

```
web ──────────────┐
                  ├──► packages/* ──► backend HTTP API
mobile ───────────┘
```

- UI components are **not** forced into a shared package unless truly cross-platform.
- Business logic, API calls, Zod schemas, ACL, and types **must** live in `packages/`.

## Frontend layering (web & mobile)

```
screens / pages
    ↓
feature hooks (React Query)
    ↓
packages/api + packages/services
    ↓
Axios → /api/*
```

## State

| Concern | Tool |
|---------|------|
| Server state | TanStack Query |
| Auth session / org context / UI prefs | Zustand |
| Forms | React Hook Form + Zod |
| Token storage (mobile) | AsyncStorage (RN CLI) |
| Token storage (web) | localStorage (parity with Vue) |

## Org context

Authenticated org-scoped requests send:

- `Authorization: Bearer <firebaseIdToken>`
- `ms-organisation-code`
- `ms-organisation-id`
- `ms-organisation-name` (when available)

## Response envelope

Backend wraps every `res.json` body with:

```ts
{
  // ...payload fields (data, etc.)
  info: {
    status: number;
    response: "success" | "failed";
    timestamp: string; // UTC
    noTimeout: boolean;
    message: string | null;
    caption: string | null;
    pagination: object | null;
  }
}
```
