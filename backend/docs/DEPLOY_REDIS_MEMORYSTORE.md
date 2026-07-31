# Google Memorystore Redis + Cloud Run

Cloud Run cannot use `REDIS_HOST=127.0.0.1`. On GCP use **Memorystore for Redis** on a VPC, and attach Cloud Run with a **Serverless VPC Access** connector.

## 1. Create Memorystore (Redis)

Console → **Memorystore → Redis → Create instance**

| Setting | Suggested value |
|---------|-----------------|
| Instance ID | `mytask-redis` |
| Tier | Basic (demo) |
| Capacity | 1 GB (smallest) |
| Region | `asia-south1` (same as Cloud Run) |
| Network | `default` VPC (or your VPC) |
| Version | Redis 7.x / 6.x |

Create, then copy **Primary endpoint IP** (e.g. `10.123.0.3`).

CLI example:

```bash
gcloud redis instances create mytask-redis \
  --size=1 \
  --region=asia-south1 \
  --redis-version=redis_7_0 \
  --project=mytask-72398
```

Get IP:

```bash
gcloud redis instances describe mytask-redis \
  --region=asia-south1 \
  --project=mytask-72398 \
  --format='value(host)'
```

## 2. Create Serverless VPC Access connector

Cloud Run needs a connector to reach private Memorystore IPs.

```bash
gcloud compute networks vpc-access connectors create mytask-vpc \
  --region=asia-south1 \
  --network=default \
  --range=10.8.0.0/28 \
  --project=mytask-72398
```

(If `10.8.0.0/28` conflicts, pick another unused `/28` in your VPC.)

Full connector resource name:

`projects/mytask-72398/locations/asia-south1/connectors/mytask-vpc`

## 3. Update `.env.cloudrun`

```bash
REDIS_HOST=10.x.x.x          # Memorystore primary IP
REDIS_PORT=6379
# REDIS_PASSWORD=            # only if you enabled AUTH on Memorystore
# REDIS_TLS=false            # Memorystore usually no TLS from VPC

VPC_CONNECTOR=projects/mytask-72398/locations/asia-south1/connectors/mytask-vpc
VPC_EGRESS=private-ranges-only

RUN_WORKERS=true
# Do NOT set REDIS_DISABLED=true
```

## 4. Redeploy

```bash
cd backend
./deploy-cloud-run.sh
```

The script attaches `--vpc-connector` when `VPC_CONNECTOR` is set, and will **not** force `REDIS_DISABLED` when `REDIS_HOST` is a real IP.

## 5. Verify

Cloud Run logs should show:

```text
✅ Redis Connected
Workers bootstrapped
```

```bash
gcloud logging read 'resource.labels.service_name="mytask-api" AND textPayload:"Redis"' \
  --project=mytask-72398 --limit=10
```

## Cost note

Memorystore + VPC connector have ongoing cost even when idle. For a cheap demo you can leave Redis disabled; for full queues/cron/email use Memorystore as above.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `REDIS_DISABLED` still true | `REDIS_HOST` must not be `127.0.0.1` / `localhost` |
| Timeout connecting to Redis | VPC connector missing/wrong region/network; Memorystore must be same region + VPC |
| Connector create fails (IP range) | Choose another `/28` not used in the VPC |
| Workers not starting | Ensure `RUN_WORKERS=true` and Redis connects |
