#!/usr/bin/env bash
#
# Deploy myTask web (Vite SPA) to Firebase Hosting on GCP project mytask-72398.
#
# Prerequisites:
#   1. gcloud / firebase login
#   2. web/.env with production VITE_* (API = Cloud Run URL)
#   3. npm install at monorepo root
#
# Usage (from web/):
#   chmod +x deploy-hosting.sh
#   ./deploy-hosting.sh
#
set -euo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$WEB_DIR/.." && pwd)"
cd "$WEB_DIR"

PROJECT_ID="${FIREBASE_PROJECT_ID:-mytask-72398}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $WEB_DIR/$ENV_FILE"
  echo "Copy from .env.example and set VITE_API_BASE_URL to your Cloud Run API, e.g.:"
  echo "  VITE_API_BASE_URL=https://mytask-api-1069285546437.asia-south1.run.app/api"
  exit 1
fi

if ! grep -q 'VITE_API_BASE_URL=https://' "$ENV_FILE"; then
  echo "Warning: VITE_API_BASE_URL does not look like a Cloud Run HTTPS URL."
  echo "Localhost builds will not talk to production API from Hosting."
  read -r -p "Continue anyway? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || exit 1
fi

command -v npm >/dev/null || { echo "npm not found"; exit 1; }

echo "==> Project: $PROJECT_ID"
echo "==> Building web (monorepo workspaces)…"
cd "$ROOT_DIR"
npm run build -w web

if [[ ! -d "$WEB_DIR/dist" ]]; then
  echo "Build failed: $WEB_DIR/dist missing"
  exit 1
fi

echo "==> Deploying to Firebase Hosting…"
cd "$WEB_DIR"

# Prefer global firebase; fall back to npx
FIREBASE_BIN="firebase"
if ! command -v firebase >/dev/null; then
  FIREBASE_BIN="npx --yes firebase-tools@latest"
fi

# Check auth before deploy (clearer than a stack trace)
if ! $FIREBASE_BIN projects:list --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo ""
  echo "Firebase CLI is not logged in."
  echo "Run this once in your terminal (browser will open):"
  echo ""
  echo "  npx firebase-tools login"
  echo ""
  echo "Then re-run:  ./deploy-hosting.sh"
  echo ""
  echo "(Your build already succeeded — dist/ is ready; login is only needed for upload.)"
  exit 1
fi

$FIREBASE_BIN deploy --only hosting --project "$PROJECT_ID"

HOSTING_URL="https://${PROJECT_ID}.web.app"
echo ""
echo "=============================================="
echo " Web deployed"
echo " URL:  $HOSTING_URL"
echo " Also: https://${PROJECT_ID}.firebaseapp.com"
echo "=============================================="
echo ""
echo "Next (important):"
echo "  1. Update backend/.env.cloudrun:"
echo "       CLIENT_URL=$HOSTING_URL/"
echo "       CORS_ORIGINS=$HOSTING_URL"
echo "       SOCKETIO_CORS_ORIGINS=$HOSTING_URL"
echo "  2. Redeploy API:  cd backend && ./deploy-cloud-run.sh"
echo "  3. Firebase Console → Authentication → Authorized domains → add ${PROJECT_ID}.web.app"
echo "  4. Restrict Maps API key HTTP referrers to https://${PROJECT_ID}.web.app/*"
echo ""
