# Deploy API to Google Cloud Run (container)

No custom domain required. Cloud Run gives you an HTTPS `*.run.app` URL.

## One-time setup

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and log in:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```
2. Create a GCP project (e.g. **myTask**) and enable **billing**.
3. From `backend/`:
   ```bash
   cp .env.cloudrun.example .env.cloudrun
   ```
4. Edit `.env.cloudrun`:
   - `GCP_PROJECT_ID` — Project ID from Cloud Console (not just the display name)
   - `GCP_REGION` — e.g. `asia-south1`, `us-central1`, `asia-southeast1`
   - DB / Redis / Firebase / Stripe / mail values
   - Leave `SERVER_URL` / `CLIENT_URL` as placeholders for the first deploy

## Deploy

```bash
cd backend
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

Default build uses **Cloud Build in GCP** (no local Docker required).

Optional:

```bash
# Build on your machine with Docker Desktop, then push
BUILD_MODE=local ./deploy-cloud-run.sh

# Redeploy same tag without rebuilding
IMAGE_TAG=20260731-120000 SKIP_BUILD=1 ./deploy-cloud-run.sh
```

## After first deploy

1. Copy the printed **Service URL** (e.g. `https://mytask-api-xxxxx-asia-south1.run.app`).
2. Update `.env.cloudrun`:
   ```bash
   SERVER_URL=https://mytask-api-xxxxx-asia-south1.run.app/api
   CLIENT_URL=https://YOUR_PROJECT.web.app/   # after you host the web app
   CORS_ORIGINS=https://YOUR_PROJECT.web.app
   ```
3. Run `./deploy-cloud-run.sh` again so env vars update.
4. Stripe webhook endpoint:  
   `https://mytask-api-xxxxx-asia-south1.run.app/api/subscriptions/webhook`
5. Build web with:
   ```bash
   VITE_API_BASE_URL=https://mytask-api-xxxxx-asia-south1.run.app/api npm run build
   ```

## Common failure: container did not listen on PORT 8080

Cloud Logging usually shows:

`Failed to parse service account json file … open './serviceAccountKey.json'`

**Cause:** the key file must not be baked into the image. The deploy script now embeds it as `FIREBASE_SERVICE_ACCOUNT_BASE64` from local `backend/serviceAccountKey.json`.

Also ensure:
- `serviceAccountKey.json` exists in `backend/` when you run `./deploy-cloud-run.sh`
- Redeploy after pulling these code fixes (image must include the new `index.js`)
- MySQL: `DB_HOST=127.0.0.1` will not work on Cloud Run — use Cloud SQL or a public DB host
- Redis: localhost is auto-disabled on deploy; add Upstash/Memorystore later and set `REDIS_HOST`

## Notes

- `.env.cloudrun` is gitignored — never commit secrets.
- For production, prefer [Secret Manager](https://cloud.google.com/secret-manager) instead of plain env for passwords/API keys.
- Cloud SQL: set `CLOUDSQL_INSTANCE` and `DB_HOST=/cloudsql/...` in `.env.cloudrun`.
- Demo tip: `CLOUD_RUN_MAX_INSTANCES=1` avoids duplicate subscription cron timers across instances.
- Deploy with `./deploy-cloud-run.sh` (builds the image via Cloud Build `--tag`; no `cloudbuild.yaml` required).
