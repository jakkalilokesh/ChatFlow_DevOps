#!/usr/bin/env bash
# scripts/create-k8s-secrets.sh  — Create Kubernetes secrets from .env file
# Usage: ./scripts/create-k8s-secrets.sh <namespace>
set -euo pipefail

NAMESPACE="${1:-production}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; exit 1; }

[ -f .env ] || err ".env file not found. Copy .env.example to .env and fill in values."

log "=== Creating Kubernetes Secrets in namespace '${NAMESPACE}' ==="

# Load .env
set -a; source .env; set +a

# Build kubectl create secret args
kubectl create secret generic app-secrets \
  -n "${NAMESPACE}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
  --from-literal=DB_USER="${POSTGRES_USER:-chatflow_user}" \
  --from-literal=DB_PASSWORD="${POSTGRES_PASSWORD:-password}" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD:-password}" \
  --from-literal=MONGO_INITDB_ROOT_USERNAME="${MONGO_INITDB_ROOT_USERNAME:-chatflow_user}" \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD="${MONGO_INITDB_ROOT_PASSWORD:-password}" \
  --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}" \
  --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}" \
  --from-literal=S3_BUCKET_NAME="${S3_BUCKET_NAME:-}" \
  --dry-run=client -o yaml | kubectl apply -f -

log "✓ Secret 'app-secrets' applied in namespace '${NAMESPACE}'"

# Create ECR image pull secret
if [ -n "${AWS_ACCOUNT_ID:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  log "Creating ECR image pull secret..."
  aws ecr get-login-password --region "${AWS_REGION:-us-east-1}" | \
    kubectl create secret docker-registry ecr-secret \
      -n "${NAMESPACE}" \
      --docker-server="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com" \
      --docker-username=AWS \
      --docker-password="$(aws ecr get-login-password --region "${AWS_REGION:-us-east-1}")" \
      --dry-run=client -o yaml | kubectl apply -f -
  log "✓ ECR pull secret 'ecr-secret' applied"
else
  log "Skipping ECR secret (AWS_ACCOUNT_ID or credentials not set)"
fi

log "=== Secret creation complete! ==="
