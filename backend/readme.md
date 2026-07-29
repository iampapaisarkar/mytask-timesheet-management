# Backend

Express API for **mySheet**. Full operational docs are in [`docs/`](./docs/).

## Quick start

```bash
cd backend
cp .env.example .env   # fill DB, Firebase, Redis, etc.
npm install
npm start              # http://localhost:8080  →  /api
```

Optional watch mode: `npm run dev`.

## Docs

| File | Topic |
|------|--------|
| [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | API overview |
| [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) | Firebase + sessions |
| [docs/DATABASE.md](./docs/DATABASE.md) | MySQL / Sequelize |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) | Env vars |
| [docs/ROUTES.md](./docs/ROUTES.md) | Route modules |
| [docs/MIDDLEWARE.md](./docs/MIDDLEWARE.md) | Auth / org middleware |
| [docs/SERVICES.md](./docs/SERVICES.md) | Service layer |
| [docs/ERROR_HANDLING.md](./docs/ERROR_HANDLING.md) | Errors |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security notes |
| [docs/RULES.md](./docs/RULES.md) | Backend coding rules |
| [readme.md](./readme.md) | Migrations, jobs, PM2, Socket.IO |

Cursor rules: `.cursor/rules/backend.mdc`.
