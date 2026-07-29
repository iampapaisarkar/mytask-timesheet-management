# Authentication

## Flow

1. Client authenticates with Firebase Auth.
2. Client sends Firebase ID token as Bearer to `/api/auth/login` (or signup).
3. `Auth.verifyFirebaseToken` calls Identity Toolkit `accounts:lookup`.
4. `Auth.createSession` stores token in `user_sessions`.
5. `TokenValidate` middleware verifies subsequent requests against sessions.

## Endpoints

Documented in root `API_ANALYSIS.md` under Auth.

## Roles

- **System role** example: `org-admin` assigned on signup.
- **Organisation roles**: `owner`, `moderator`, `manager`, `staff` — ACL in `class/acl.js`.
