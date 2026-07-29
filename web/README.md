# Web (React + Vite)

SPA for **mySheet**. Dev server runs on port **9000**.

## Quick start

```bash
# from monorepo root (after npm install --legacy-peer-deps)
cp web/.env.example web/.env   # set VITE_API_BASE_URL + Firebase
npm run web
```

Open [http://localhost:9000](http://localhost:9000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w web` | Dev server |
| `npm run build -w web` | Production build → `web/dist` |
| `npm run preview -w web` | Preview production build |
| `npm run typecheck -w web` | TypeScript check |

## Docs

See [`docs/`](./docs/) — architecture, routing, state, API usage, styling, testing, deployment.

Cursor rules: `.cursor/rules/web.mdc`.
