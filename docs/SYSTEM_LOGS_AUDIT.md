# System Logs & API Audit

Branch: `feature/system-logs-audit`

## Overview

Organisation-scoped audit trail (not developer console logs):

| Tab | Source | Table |
|-----|--------|-------|
| Internal API | `requestAudit` middleware | `audit_internal_api_logs` |
| External API | `external-api-log.service` (FCM, future wrappers) | `audit_external_api_logs` |
| Email | `email.service` via NodeMailer | `audit_email_logs` |

Writes are **async** via BullMQ `auditQueue` (fallback in-process buffer if Redis is down).

## Security

`utils/audit-redact.js` masks passwords, tokens, API keys, cookies, JWTs before persistence.

## Permissions

`systemLog` ACL: owner/moderator/manager list+view; staff list (own `user_id` only).

## Retention

`AUDIT_LOG_RETENTION_DAYS` (30–365, default 90). Daily cleanup in `workers.js`.

## API

```
GET /api/system-logs/summary
GET /api/system-logs/internal
GET /api/system-logs/external
GET /api/system-logs/email
GET /api/system-logs/export?type=internal
GET /api/system-logs/:type/:id
```

Requires Token + OrganisationValidate + `systemLog.list`.

## Migration

`backend/migrations/1787300000000-enterprise-system-audit-logs.js`
