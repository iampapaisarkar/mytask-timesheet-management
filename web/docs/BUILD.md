# Web Build

## Development

```bash
# from monorepo root
cp web/.env.example web/.env
npm run web
```

- URL: http://localhost:9000
- Requires backend at `VITE_API_BASE_URL` (default `http://localhost:8080/api`)
- Requires Firebase web config in `web/.env`

## Production build

```bash
npm run build -w web
# artefacts in web/dist/
npm run preview -w web
```
