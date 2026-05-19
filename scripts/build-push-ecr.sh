#!/usr/bin/env bash
# scripts/build-push-ecr.sh  — Build all Docker images and push to ECR
# Usage: ./scripts/build-push-ecr.sh [image-tag]
set -euo pipefail

IMAGE_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID must be set}"
AWS_ACCOUNT_ID=$(echo "${AWS_ACCOUNT_ID}" | tr -d '[:space:]' | tr -d '\r')
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT="chat-app"

SERVICES=(
  "auth-service:./auth-service"
  "chat-service:./chat-service"
  "user-service:./user-service"
  "notification-service:./notification-service"
  "call-service:./call-service"
)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "=== Build & Push to ECR ==="
log "Registry: ${ECR_REGISTRY}"
log "Tag:      ${IMAGE_TAG}"

# Login
log "Authenticating with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

for entry in "${SERVICES[@]}"; do
  SVC="${entry%%:*}"
  CTX="${entry##*:}"
  LOCAL="${PROJECT}-${SVC}:${IMAGE_TAG}"
  REMOTE="${ECR_REGISTRY}/${PROJECT}-${SVC}:${IMAGE_TAG}"
  LATEST="${ECR_REGISTRY}/${PROJECT}-${SVC}:latest"

  log "Building ${SVC}..."
  docker build --platform linux/amd64 -t "${LOCAL}" "${CTX}"

  log "Tagging and pushing ${SVC}..."
  docker tag "${LOCAL}" "${REMOTE}"
  docker tag "${LOCAL}" "${LATEST}"
  docker push "${REMOTE}"
  docker push "${LATEST}"

  log "  ✓ ${SVC} pushed as ${REMOTE}"
done

# Cleanup local images
log "Cleaning up local images..."
for entry in "${SERVICES[@]}"; do
  SVC="${entry%%:*}"
  docker rmi "${PROJECT}-${SVC}:${IMAGE_TAG}" 2>/dev/null || true
done

log "=== Build & Push complete! Image tag: ${IMAGE_TAG} ==="
