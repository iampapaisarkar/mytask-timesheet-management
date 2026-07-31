# Deploy web to Google Cloud (Firebase Hosting)

The web app is a static Vite SPA. Host it on **Firebase Hosting** in the same GCP/Firebase project as the API (`mytask-72398`). You get HTTPS URLs with no custom domain:

- `https://mytask-72398.web.app`
- `https://mytask-72398.firebaseapp.com`

## One-time setup

1. Install Firebase CLI (optional — script can use `npx`):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Ensure Firebase Hosting is enabled for project `mytask-72398`  
   (Console → Firebase → Build → Hosting → Get started), or the first deploy will create it.
3. Configure `web/.env` for production:
   ```bash
   VITE_API_BASE_URL=https://mytask-api-1069285546437.asia-south1.run.app/api
   # + existing Firebase / Maps / VAPID keys
   ```
   Vite bakes these in at **build** time.

## Deploy

```bash
cd web
chmod +x deploy-hosting.sh
./deploy-hosting.sh
```

This runs `npm run build -w web` then `firebase deploy --only hosting`.

## After first web deploy

1. **Backend CORS / Socket / Stripe redirects** — in `backend/.env.cloudrun`:
   ```bash
   CLIENT_URL=https://mytask-72398.web.app/
   CORS_ORIGINS=https://mytask-72398.web.app
   SOCKETIO_CORS_ORIGINS=https://mytask-72398.web.app
   ```
   Then:
   ```bash
   cd backend && ./deploy-cloud-run.sh
   ```

2. **Firebase Auth** → Authentication → Settings → Authorized domains  
   Add: `mytask-72398.web.app` (and `mytask-72398.firebaseapp.com` if missing).

3. **Google Maps key** → restrict HTTP referrers to:
   - `https://mytask-72398.web.app/*`
   - `http://localhost:9000/*` (for local dev)

## Files

| File | Purpose |
|------|---------|
| `firebase.json` | Hosting `dist/` + SPA rewrite to `index.html` |
| `.firebaserc` | Default project `mytask-72398` |
| `deploy-hosting.sh` | Build + deploy |

## Alternative: Cloud Run / GCS

Possible but more setup. Firebase Hosting is the simplest match for this Vite app and your existing Firebase Auth project.
