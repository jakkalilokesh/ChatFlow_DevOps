#!/usr/bin/env bash
# scripts/create-k8s-secrets.sh — Create Kubernetes secrets from .env
# Usage: ./scripts/create-k8s-secrets.sh <namespace>
# Must be run from the repo root after filling in .env
set -euo pipefail

NAMESPACE="${1:-production}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; exit 1; }

[ -f .env ] || err ".env file not found. Copy .env.example → .env and fill in values."

log "=== Creating Kubernetes Secrets in namespace '${NAMESPACE}' ==="

# Load .env so all vars are available
set -a; source .env; set +a

# ── app-secrets (all sensitive values consumed by microservices) ──────────────
kubectl create secret generic app-secrets \
  -n "${NAMESPACE}" \
  \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
  \
  --from-literal=DB_USER="${POSTGRES_USER:-chatflow_user}" \
  --from-literal=DB_PASSWORD="${POSTGRES_PASSWORD}" \
  \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  \
  --from-literal=MONGO_INITDB_ROOT_USERNAME="${MONGO_INITDB_ROOT_USERNAME:-chatflow_user}" \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD="${MONGO_INITDB_ROOT_PASSWORD}" \
  --from-literal=MONGO_URI="${MONGO_URI}" \
  \
  --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
  --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
  \
  --from-literal=SMTP_USER="${SMTP_USER:-}" \
  --from-literal=SMTP_PASSWORD="${SMTP_PASSWORD:-}" \
  \
  --from-literal=GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  --from-literal=GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
  --from-literal=GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:-}" \
  --from-literal=GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-}" \
  \
  --from-literal=VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}" \
  --from-literal=VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY:-}" \
  --from-literal=VAPID_SUBJECT="${VAPID_SUBJECT:-}" \
  \
  --from-literal=HF_API_TOKEN="${HF_API_TOKEN:-}" \
  --from-literal=ANNOUNCED_IP="${ANNOUNCED_IP:-}" \
  \
  --from-literal=GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-}" \
  \
  --dry-run=client -o yaml | kubectl apply -f -

log "✓ Secret 'app-secrets' applied in namespace '${NAMESPACE}'"

# ── ECR image-pull secret ─────────────────────────────────────────────────────
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${ECR_REGISTRY:-}" ]; then
  log "Creating ECR image-pull secret..."
  ACCOUNT_ID="${ECR_REGISTRY%%.*}"   # strip everything from first dot onward
  ECR_PASSWORD=$(aws ecr get-login-password --region "${AWS_REGION:-us-east-1}")
  kubectl create secret docker-registry ecr-secret \
    -n "${NAMESPACE}" \
    --docker-server="${ECR_REGISTRY}" \
    --docker-username=AWS \
    --docker-password="${ECR_PASSWORD}" \
    --dry-run=client -o yaml | kubectl apply -f -
  log "✓ ECR pull secret 'ecr-secret' applied"
else
  log "⚠ Skipping ECR secret (AWS_ACCESS_KEY_ID or ECR_REGISTRY not set)"
fi

log "=== Secret creation complete for namespace '${NAMESPACE}' ==="
