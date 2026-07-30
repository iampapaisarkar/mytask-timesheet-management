# Authentication Architecture

## Principle

Firebase Authentication is the source of truth for identity.

- Clients never send a stale ID token when Firebase can refresh it.
- The backend always cryptographically verifies the Bearer ID token with
  **Firebase Admin** (`verifyIdToken(token, checkRevoked=true)`).
- Application “sessions” are device/activity records keyed by **token hash**,
  not by trusting a DB row alone to skip verification.

## Client flow

```
Firebase Auth SDK
      │
      ▼
AuthTokenManager (single-flight getValidIdToken)
      │
      ├── Axios request interceptor → Authorization: Bearer <fresh>
      ├── Socket.IO handshake / reconnect auth
      └── Auth store (profile + last known token mirror)
```

### Token manager guarantees

- One in-flight refresh shared by concurrent callers
- Refresh ~5 minutes before JWT `exp` when possible
- Force refresh on 401 (once), then retry the original request
- Call logout / `onUnauthorized` only when Firebase has no user or force refresh fails

### Lifecycle

| Event | Action |
|-------|--------|
| Login / signup | Firebase sign-in → TokenManager sync → `/auth/login` or `/auth/signup` |
| Reload / cold start | Block UI until Firebase Auth persistence restore (`waitUntilReady`); hydrate profile; if Firebase user exists fetch ID token; else clear storage (never send API calls before ready) |
| `onIdTokenChanged` | Update TokenManager, store mirror, socket auth + reconnect if needed |
| Visibility / AppState resume | `getValidIdToken()` (SDK refreshes if needed) |
| Logout | `POST /auth/logout` → Firebase `signOut` → wipe stores / query / sockets |

## Backend flow

```
Authorization: Bearer <Firebase ID token>
      │
      ▼
TokenValidate
      │
      ▼
Auth.verifyIdTokenAndResolveUser
      ├── Redis cache auth:claims:{sha256(token)} (until min(exp, now+5m))
      ├── admin.auth().verifyIdToken(token, true)
      ├── Resolve user via firebase_providers.uid
      └── Touch user_sessions (token_hash, last_activity)
      │
      ▼
req.user (+ req.body.user for legacy controllers)
```

### Auth error codes (HTTP 401 body `code`)

| Code | Meaning |
|------|---------|
| `AUTH_MISSING` | No Bearer token |
| `AUTH_INVALID` | Malformed / wrong audience / not a valid ID token |
| `AUTH_EXPIRED` | Token past `exp` |
| `AUTH_REVOKED` | User tokens revoked |
| `AUTH_DISABLED` | Firebase user disabled |
| `AUTH_USER_NOT_FOUND` | Valid Firebase UID but no local user |

## Device sessions (`user_sessions`)

- Stores `token_hash` (SHA-256 of JWT), not the raw JWT as the auth key
- Fields: `revoked_at`, `last_activity_at`, `platform`, `user_agent`
- Used for logout revoke + audit; **never** replaces Admin verification

## Socket.IO

- Same verification path as REST
- Client supplies fresh token from TokenManager on connect / reconnect / token rotation

## Why users no longer “randomly” log out

Previously the app stored one JWT and reused it until the backend returned 401,
then wiped the entire session. Firebase ID tokens expire ~1 hour; without
proactive refresh that looked like a random logout.

Now the Firebase SDK keeps the session alive, TokenManager always attaches a
valid ID token, and 401 only clears local state when Firebase itself has no
session.
