# Authentication

See root [docs/AUTH_ARCHITECTURE.md](../../docs/AUTH_ARCHITECTURE.md) for the full model.

## Flow

1. Client authenticates with Firebase Auth (email/password, etc.).
2. Client obtains a fresh Firebase **ID token** via `AuthTokenManager` /
   `user.getIdToken()`.
3. Client sends `Authorization: Bearer <idToken>` to `/api/auth/login` or
   `/api/auth/signup`.
4. Backend verifies with **Firebase Admin** `verifyIdToken(token, true)`.
5. Backend resolves the local user (`firebase_providers`) and records a device
   session (`user_sessions.token_hash`).
6. Subsequent API / Socket requests: same Bearer ID token → Admin verify
   (Redis-cached claims) → `req.user`.

## Middleware

- `TokenValidate` — required on protected routes
- `OrganisationValidate` — org membership + ACL (after auth)

## Roles

- **System role** example: `org-admin` assigned on signup.
- **Organisation roles**: `owner`, `moderator`, `manager`, `staff` — ACL in
  `class/acl.js`.
