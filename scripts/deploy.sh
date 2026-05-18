#!/usr/bin/env bash
# scripts/deploy.sh  — Kubernetes rolling deploy
# Usage: ./scripts/deploy.sh <namespace> <image-tag>
set -euo pipefail

NAMESPACE="${1:-production}"
IMAGE_TAG="${2:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT="chat-app"

SERVICES=(
  "frontend"
  "auth-service"
  "chat-service"
  "user-service"
  "notification-service"
  "call-service"
  "ai-service"
)

K8S_SERVICES=(
  "frontend"
  "auth-service"
  "chat-service"
  "user-service"
  "notification-service"
  "call-service"
  "ai-service"
)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; }

log "=== ChatFlow Deploy ==="
log "Namespace: ${NAMESPACE}"
log "Image Tag: ${IMAGE_TAG}"

# Bypass TLS validation for Jenkins CI and create ECR Image Pull Secret
log "Configuring Kubernetes TLS and generating ECR pull secret..."
kubectl config set-cluster default --insecure-skip-tls-verify=true --kubeconfig="$KUBECONFIG" 2>/dev/null || true
TOKEN=$(aws ecr get-login-password --region "${AWS_REGION}")
kubectl create secret docker-registry ecr-secret \
  --docker-server="${ECR_REGISTRY}" \
  --docker-username=AWS \
  --docker-password="${TOKEN}" \
  -n "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Apply ConfigMap and base manifests
log "Applying namespace and config..."
kubectl apply -f kubernetes/namespaces/namespaces.yaml --validate=false || true
kubectl apply -f kubernetes/configmaps/app-config.yaml -n "${NAMESPACE}"
kubectl apply -f kubernetes/storage/pvcs.yaml -n "${NAMESPACE}" || true

# Update each service image
for svc in "${SERVICES[@]}"; do
  IMAGE="${ECR_REGISTRY}/${PROJECT}-${svc}:${IMAGE_TAG}"
  log "Setting image for ${svc} → ${IMAGE}"
  kubectl set image "deployment/${svc}" "${svc}=${IMAGE}" -n "${NAMESPACE}" 2>/dev/null || {
    # First deploy — apply full manifest
    log "First deploy for ${svc}, applying full manifest..."
    sed "s|REGISTRY/${PROJECT}-${svc}:latest|${IMAGE}|g" \
      kubernetes/deployments/deployments.yaml | \
      kubectl apply -n "${NAMESPACE}" -f - 2>/dev/null || true
  }
done

# Apply services and ingress
log "Applying services and ingress..."
kubectl apply -f kubernetes/services/services.yaml -n "${NAMESPACE}"
kubectl apply -f kubernetes/ingress/ingress.yaml -n "${NAMESPACE}" 2>/dev/null || true
kubectl apply -f kubernetes/hpa/hpa.yaml -n "${NAMESPACE}" 2>/dev/null || true

# Wait for rollout
log "Waiting for rollouts to complete..."
for svc in "${K8S_SERVICES[@]}"; do
  log "  Waiting for ${svc}..."
  if ! kubectl rollout status "deployment/${svc}" -n "${NAMESPACE}" --timeout=180s; then
    err "Rollout failed for ${svc}!"
    kubectl rollout undo "deployment/${svc}" -n "${NAMESPACE}" || true
    exit 1
  fi
done

log "=== Deploy complete! ==="
kubectl get pods -n "${NAMESPACE}" --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
