#!/bin/sh
# scripts/pull-ollama-models.sh
# Pulls the configured Ollama model into the running container.
# Run once after `docker-compose up` or as a k8s Job.
#
# Usage: ./scripts/pull-ollama-models.sh [model]
#        MODEL=phi3.5:mini ./scripts/pull-ollama-models.sh

set -e

MODEL="${1:-${OLLAMA_MODEL:-phi3.5:mini}}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

echo "⏳ Waiting for Ollama to be ready at $OLLAMA_URL ..."
for i in $(seq 1 30); do
  if curl -sf "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo "✅ Ollama is ready."
    break
  fi
  echo "  Attempt $i/30 — retrying in 5s..."
  sleep 5
done

echo "📦 Pulling model: $MODEL"
curl -X POST "$OLLAMA_URL/api/pull" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$MODEL\", \"stream\": false}"

echo ""
echo "✅ Model '$MODEL' pulled successfully."

# Also pull a code-focused model if resources allow
# Uncomment to enable:
# echo "📦 Pulling secondary model: codellama:7b-instruct"
# curl -X POST "$OLLAMA_URL/api/pull" \
#   -H "Content-Type: application/json" \
#   -d '{"name": "codellama:7b-instruct", "stream": false}'
