# System Design

## Authentication flow

1. User signs in with **Firebase Auth** (email/password; Google may exist via Firebase providers).
2. Client obtains Firebase **ID token**.
3. Client calls `POST /api/auth/login` with:
   - Header `Authorization: Bearer <idToken>`
   - Body: `{ email, invitation_token?, fcmToken?, oldFcmToken?, platform?, timezone? }`
4. Backend verifies token via Firebase Identity Toolkit `accounts:lookup`, creates/updates `user_sessions`, returns user profile.
5. Subsequent API calls use the same Bearer token. Backend `TokenValidate` checks session validity in DB (+ Firebase verify path).
6. Logout: `POST /api/auth/logout` (authenticated).

### Signup

`POST /api/auth/signup` with profile fields + Firebase `uid` + `providerData`, Bearer ID token. Creates user, firebase provider row, assigns system role `org-admin`, may send verification email via Firebase action URL `{CLIENT_URL}auth-actions?email=...`.

### Forgot password

`POST /api/auth/forgot-password` — Firebase password reset flow (backend orchestrates).

### Invitation

- `POST /api/auth/verify-organisation-invitation-token`
- Org invitation UI route: `/org-invitation`
- Accept/reject: `/api/organisations/accept-invitation`, `/api/organisations/reject-invitation`

## Organisation context

Users may belong to multiple organisations. After login, home lists orgs; selecting one navigates to `/org/:orgCode/...` and sets org headers for all org-scoped APIs.

`OrganisationValidate` middleware requires `orgId` on the request body (injected from headers by `TokenValidate`) and loads organisation membership (Redis-cached).

## ACL (organisation roles)

From `backend/class/acl.js` — roles: `owner`, `moderator`, `manager`, `staff`.

Permissions per resource: `list`, `view`, `create`, `edit`, `delete`.

| Resource | Owner | Moderator | Manager | Staff |
|----------|-------|-----------|---------|-------|
| timesheet | none | full edit | full edit | full edit |
| timesheetManagement | full | full | full (org-wide) | none |
| report | list+view | list+view | list+view | list+view |
| employee | CRUD-ish | CRUD-ish | none | none |
| customer | CRUD-ish | CRUD-ish | none | none |
| job | CRUD-ish | CRUD-ish | CRUD-ish | list |
| region / holiday / earning / award | yes | yes | no | no |
| payrollCalendar | list+create | list+create | no | no |
| setting | list | list | no | no |
| xero | full | none | none | none |
| organisationSetting | view+edit | view | none | none |

Jobs and timesheet-management staff lists are organisation-scoped (no management groups). Managers see all org employees for timesheet management; staff see only their own timesheets.

Frontend routes gate via `meta.acl: { action, permission }`.

## Realtime & push

- **Socket.IO** — client connects with token; events for live updates.
- **FCM** — `POST /api/auth/update-fcm-token`; service worker present in web build.

## Xero

OAuth-style connect under `/xero/authenticate` (frontend) → backend `/api/xero/connect`, `/finalize`, `/disconnect`, push/fetch endpoints.
