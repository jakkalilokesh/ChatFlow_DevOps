#!/bin/bash
set -e

WORKER_AI_IP=$1
WORKER_BACKEND_IP=$2
WORKER_SUPPORT_IP=$3

echo "🏷️ Applying node role labels on Master..."

# Wait for nodes to report ready
sleep 15

# Label AI worker
AI_NODE=$(kubectl get nodes -o jsonpath="{.items[?(@.status.addresses[?(@.type=='ExternalIP')].address=='$WORKER_AI_IP')].metadata.name}")
if [ ! -z "$AI_NODE" ]; then
  kubectl label node "$AI_NODE" node-role.kubernetes.io/worker=ai --overwrite
  echo "Labeled node $AI_NODE as AI Worker"
else
  echo "Could not find node for IP $WORKER_AI_IP"
fi

# Label Backend worker
BACKEND_NODE=$(kubectl get nodes -o jsonpath="{.items[?(@.status.addresses[?(@.type=='ExternalIP')].address=='$WORKER_BACKEND_IP')].metadata.name}")
if [ ! -z "$BACKEND_NODE" ]; then
  kubectl label node "$BACKEND_NODE" node-role.kubernetes.io/worker=backend --overwrite
  echo "Labeled node $BACKEND_NODE as Backend Worker"
else
  echo "Could not find node for IP $WORKER_BACKEND_IP"
fi

# Label Support worker
SUPPORT_NODE=$(kubectl get nodes -o jsonpath="{.items[?(@.status.addresses[?(@.type=='ExternalIP')].address=='$WORKER_SUPPORT_IP')].metadata.name}")
if [ ! -z "$SUPPORT_NODE" ]; then
  kubectl label node "$SUPPORT_NODE" node-role.kubernetes.io/worker=support --overwrite
  echo "Labeled node $SUPPORT_NODE as Support Worker"
else
  echo "Could not find node for IP $WORKER_SUPPORT_IP"
fi

# Create namespaces
kubectl create namespace production || true
kubectl create namespace staging || true
kubectl create namespace monitoring || true

# Deploy Nginx Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

echo "✅ Node labeling and base cluster setup complete!"
