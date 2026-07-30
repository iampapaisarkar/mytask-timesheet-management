# Enterprise API Architecture

Branch: `feature/enterprise-api-architecture`

## Goals

Split giant screen aggregates into single-responsibility endpoints, load them in parallel on clients, harden middleware, and keep existing contracts working.

## Dashboard APIs

| Endpoint | Responsibility |
|----------|----------------|
| `GET /api/screens/dashboard/summary` | KPIs + display currency |
| `GET /api/screens/dashboard/graphs` | Charts / trends |
| `GET /api/screens/dashboard/recent` | Activity feed + latest payout |
| `GET /api/screens/dashboard/pending` | Pending approvals / quick links |
| `GET /api/screens/dashboard` | Aggregate (backward compatible) |

Server-side Redis context cache (~20s) ensures parallel slice requests share one timesheet scan.

Clients use `useDashboardParallel()` (`@mytask/hooks`) → `useQueries` → four slice APIs simultaneously.

## Response envelope

Additive (does **not** remove legacy `info`):

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": { "durationMs": 12 },
  "errors": null,
  "requestId": "…",
  "info": { "status": 200, "response": "success", "…" }
}
```

## Middleware stack

1. Correlation ID  
2. Security headers  
3. Request logger  
4. Rate limiter (Redis)  
5. Compression / body / CORS  
6. Response envelope  
7. Routes  
8. Error handler (after routes)

## Layering

```
Routes → Controllers (thin) → Services → Repositories → Sequelize
```

Dashboard is the reference implementation (`dashboard.repository.js` + `dashboard.service.js`).

## Auth (unchanged contract)

Firebase ID token → `@mytask/auth` TokenManager → Axios interceptor (refresh on 401) → `TokenValidate`.

Login now rejects body email ≠ Firebase token email.
