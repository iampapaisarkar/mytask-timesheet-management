# Security

- Firebase token verification for login/signup
- Session table for API authorization
- CORS currently `origin: "*"` — tighten for production if required
- Service account JSON files present in repo — rotate and exclude from public remotes
- Do not expose `CRON_SECRET`, DB passwords, or mail credentials to clients
- Redis used for org cache — ensure network isolation in prod
