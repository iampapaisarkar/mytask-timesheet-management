# Backend Analysis

## Stack

- **Runtime:** Node ≥ 20, ESM (`"type": "module"`)
- **Framework:** Express 4
- **ORM:** Sequelize 6 + mysql2
- **Auth:** Firebase ID tokens + DB `user_sessions`
- **Realtime:** Socket.IO (+ Redis adapter)
- **Queue:** BullMQ + Redis
- **Storage:** Google Cloud Storage
- **Integrations:** Firebase Admin, Nodemailer
- **Other:** Multer uploads, Sharp/HEIC image processing, Puppeteer, compression, CORS `*`

## Entry

`backend/index.js` — HTTP server, CORS, body 10mb, response `info` envelope, mounts `/api`, optional workers.

## Middleware

| File | Role |
|------|------|
| `tokenvalidate.js` | Bearer token → verify session → attach `req.body.user` + org headers |
| `organisationvalidate.js` | Require org membership; Redis cache `organisation:{orgId}:{userId}` |
| `cronvalidate.js` | Protect cron endpoints |

## ACL

`class/acl.js` — organisation role permission matrix (see `SYSTEM_DESIGN.md`).

## Auth class

`class/auth.js` — `attempt`, `verifyFirebaseToken`, `verifyToken`, `createSession`, `getUser`, timezone helpers.

## Models (selected)

Users, UserSessions, Organisations, OrganisationRoles, UserOrganisationRoles, Employees, EmployeeInvitations, Timesheets, TimesheetDays, TimesheetDayTasks, Customers, Jobs, geographic lookup tables, HolidayCalendars, PayrollCalendars, EarningRates, AwardRates (+ rule tables), Notifications, FcmConnections, and many lookup tables (employment types, leave categories, states, etc.).

## Services

Organisation, employee, timesheet, timesheet-activity, timesheet-rate, award-rate, email, external-api-log.

## GraphQL

Present under `graphql/` but **disabled** (`setupGraphQL` commented out). Rebuild uses REST only.

## Environment (from `.env.example`)

`APP_HOST_PORT`, `APP_NAME`, `CLIENT_URL`, `SERVER_URL`, DB_*, `NODE_ENV`, `START_SERVER`, `RUN_WORKERS`, `CRON_SECRET`, Firebase, SocketIO token, Mail, Redis.

## Frontend implications

1. Always send Firebase Bearer token.
2. Org-scoped routes need org headers.
3. Expect `{ data, info }` style responses.
4. HTTP 401 → force re-auth / refresh Firebase token and retry login session.
5. Socket.IO URL typically same host as API without `/api` suffix.
6. FCM web config embedded in service worker (Firebase project `mytask-72398`).
