#!/usr/bin/env bash
#
# Deploy myTask API to Google Cloud Run (container image).
#
# Prerequisites:
#   1. gcloud CLI installed and logged in:  gcloud auth login
#   2. Docker Desktop running  (only if BUILD_MODE=local)
#   3. Copy .env.cloudrun.example → .env.cloudrun and fill values
#   4. Billing enabled on the GCP project
#
# Usage (from backend/):
#   chmod +x deploy-cloud-run.sh
#   ./deploy-cloud-run.sh
#
# Optional:
#   BUILD_MODE=local ./deploy-cloud-run.sh   # build on your machine, then push
#   SKIP_BUILD=1 ./deploy-cloud-run.sh       # redeploy existing image tag only
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.cloudrun}"
BUILD_MODE="${BUILD_MODE:-cloudbuild}" # cloudbuild | local
SKIP_BUILD="${SKIP_BUILD:-0}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy the template and edit it:"
  echo "  cp .env.cloudrun.example .env.cloudrun"
  exit 1
fi

# Load KEY=VALUE (ignore comments / blank lines).
set -a
# shellcheck disable=SC1090
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
  export "$line"
done < "$ENV_FILE"
set +a

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in $ENV_FILE}"
: "${GCP_REGION:?Set GCP_REGION in $ENV_FILE}"
: "${CLOUD_RUN_SERVICE:?Set CLOUD_RUN_SERVICE in $ENV_FILE}"
: "${ARTIFACT_REPO:?Set ARTIFACT_REPO in $ENV_FILE}"

IMAGE_NAME="${IMAGE_NAME:-mytask-api}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"
MEMORY="${CLOUD_RUN_MEMORY:-1Gi}"
CPU="${CLOUD_RUN_CPU:-1}"
MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-3}"
MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
ALLOW_UNAUTH="${CLOUD_RUN_ALLOW_UNAUTH:-true}"
TIMEOUT="${CLOUD_RUN_TIMEOUT:-300}"

IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
IMAGE_URI_LATEST="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:latest"

echo "==> Project:  $GCP_PROJECT_ID"
echo "==> Region:   $GCP_REGION"
echo "==> Service:  $CLOUD_RUN_SERVICE"
echo "==> Image:    $IMAGE_URI"
echo "==> Build:    $BUILD_MODE"

command -v gcloud >/dev/null || {
  echo "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
}

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

# Enable required APIs (idempotent)
echo "==> Enabling APIs (Cloud Run, Build, Artifact Registry)…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$GCP_PROJECT_ID" >/dev/null

# Create Artifact Registry Docker repo if missing
if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repo: $ARTIFACT_REPO"
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="myTask API container images" \
    --project="$GCP_PROJECT_ID"
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  if [[ "$BUILD_MODE" == "local" ]]; then
    command -v docker >/dev/null || {
      echo "Docker not found. Install Docker Desktop or use BUILD_MODE=cloudbuild"
      exit 1
    }
    echo "==> Building image locally…"
    docker build -t "$IMAGE_URI" -t "$IMAGE_URI_LATEST" .
    echo "==> Configuring Docker auth for Artifact Registry…"
    gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
    echo "==> Pushing image…"
    docker push "$IMAGE_URI"
    docker push "$IMAGE_URI_LATEST"
  else
    echo "==> Building & pushing via Cloud Build…"
    gcloud builds submit \
      --project="$GCP_PROJECT_ID" \
      --tag="$IMAGE_URI" \
      .
    # Also tag latest (best-effort)
    gcloud artifacts docker tags add "$IMAGE_URI" "$IMAGE_URI_LATEST" \
      --quiet 2>/dev/null || true
  fi
else
  echo "==> SKIP_BUILD=1 — using existing image tag: $IMAGE_TAG"
  IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Build env-vars YAML for gcloud (handles spaces; avoid putting raw JSON with commas in --set-env-vars)
ENV_VARS_FILE="$(mktemp -t mytask-cloudrun-env.XXXXXX.yaml)"
cleanup_env_file() { rm -f "$ENV_VARS_FILE"; }
trap cleanup_env_file EXIT

{
  echo "APP_HOST_PORT: \"8080\""
  echo "NODE_ENV: \"development\""
  echo "START_SERVER: \"true\""
} > "$ENV_VARS_FILE"

while IFS='=' read -r key value || [[ -n "$key" ]]; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  case "$key" in
    GCP_*|CLOUD_RUN_*|IMAGE_*|ARTIFACT_REPO|BUILD_MODE|SKIP_BUILD|ENV_FILE|CLOUDSQL_INSTANCE|VPC_CONNECTOR|VPC_EGRESS) continue ;;
    APP_HOST_PORT|NODE_ENV|START_SERVER) continue ;;
    FIREBASE_SERVICE_ACCOUNT_BASE64|FIREBASE_SERVICE_ACCOUNT_JSON) continue ;; # injected below
  esac
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  # YAML double-quoted: escape backslash and quote
  value_escaped="${value//\\/\\\\}"
  value_escaped="${value_escaped//\"/\\\"}"
  echo "${key}: \"${value_escaped}\"" >> "$ENV_VARS_FILE"
done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')

# Inject Firebase service account from local file (never bake key into the Docker image)
SA_FILE="${FIREBASE_SERVICE_ACCOUNT_PATH:-serviceAccountKey.json}"
if [[ -f "$SA_FILE" ]]; then
  echo "==> Embedding Firebase credentials from $SA_FILE (base64 env)…"
  SA_B64="$(base64 < "$SA_FILE" | tr -d '\n')"
  echo "FIREBASE_SERVICE_ACCOUNT_BASE64: \"${SA_B64}\"" >> "$ENV_VARS_FILE"
elif [[ -n "${FIREBASE_SERVICE_ACCOUNT_BASE64:-}" ]]; then
  echo "==> Using FIREBASE_SERVICE_ACCOUNT_BASE64 from environment…"
  echo "FIREBASE_SERVICE_ACCOUNT_BASE64: \"${FIREBASE_SERVICE_ACCOUNT_BASE64}\"" >> "$ENV_VARS_FILE"
else
  echo "ERROR: No Firebase service account found."
  echo "Place serviceAccountKey.json in backend/ (gitignored) or set FIREBASE_SERVICE_ACCOUNT_BASE64."
  exit 1
fi

# Without a real Redis host, Cloud Run cannot use 127.0.0.1 — skip workers/adapter
REDIS_HOST_VAL="${REDIS_HOST:-}"
if [[ -z "$REDIS_HOST_VAL" || "$REDIS_HOST_VAL" == "127.0.0.1" || "$REDIS_HOST_VAL" == "localhost" ]]; then
  echo "==> REDIS_HOST is local/missing — setting REDIS_DISABLED=true and RUN_WORKERS=false for Cloud Run"
  echo "REDIS_DISABLED: \"true\"" >> "$ENV_VARS_FILE"
  echo "RUN_WORKERS: \"false\"" >> "$ENV_VARS_FILE"
else
  echo "==> Using Redis at $REDIS_HOST_VAL (ensure VPC_CONNECTOR is set for Memorystore)"
fi

AUTH_FLAG="--allow-unauthenticated"
if [[ "$ALLOW_UNAUTH" != "true" ]]; then
  AUTH_FLAG="--no-allow-unauthenticated"
fi

echo "==> Deploying to Cloud Run…"
DEPLOY_CMD=(
  gcloud run deploy "$CLOUD_RUN_SERVICE"
  --project="$GCP_PROJECT_ID"
  --image="$IMAGE_URI"
  --region="$GCP_REGION"
  --platform=managed
  "$AUTH_FLAG"
  --port=8080
  --memory="$MEMORY"
  --cpu="$CPU"
  --timeout="$TIMEOUT"
  --max-instances="$MAX_INSTANCES"
  --min-instances="$MIN_INSTANCES"
  --env-vars-file="$ENV_VARS_FILE"
)

if [[ -n "${CLOUDSQL_INSTANCE:-}" ]]; then
  DEPLOY_CMD+=(--add-cloudsql-instances="$CLOUDSQL_INSTANCE")
fi

# Memorystore Redis requires Serverless VPC Access
if [[ -n "${VPC_CONNECTOR:-}" ]]; then
  DEPLOY_CMD+=(--vpc-connector="$VPC_CONNECTOR")
  DEPLOY_CMD+=(--vpc-egress="${VPC_EGRESS:-private-ranges-only}")
  echo "==> Attaching VPC connector: $VPC_CONNECTOR (egress=${VPC_EGRESS:-private-ranges-only})"
fi

"${DEPLOY_CMD[@]}"

SERVICE_URL="$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --format='value(status.url)')"

echo ""
echo "=============================================="
echo " Deployed successfully"
echo " Service URL: $SERVICE_URL"
echo " API base:    $SERVICE_URL/api"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Set CLIENT_URL / SERVER_URL in .env.cloudrun to match your web + this URL, then redeploy."
echo "  2. Stripe webhook: $SERVICE_URL/api/subscriptions/webhook"
echo "  3. Build web with VITE_API_BASE_URL=$SERVICE_URL/api"
echo ""
