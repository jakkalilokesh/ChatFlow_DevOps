#!/bin/bash
# ==============================================================================
# ChatFlow — Automated Multi-Node K3s Cluster Deployment Script
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Configured node IP addresses from Terraform outputs
MASTER_IP="34.234.215.6"
WORKER_AI_IP="44.193.213.221"
WORKER_BACKEND_IP="44.211.253.76"
WORKER_SUPPORT_IP="44.203.161.187"

SSH_KEY="test.pem"

echo "======================================================================"
echo "🚀 Initializing ChatFlow Multi-Node K3s Cluster Deployment"
echo "======================================================================"
echo "Master IP:         $MASTER_IP"
echo "AI Worker IP:      $WORKER_AI_IP"
echo "Backend Worker IP: $WORKER_BACKEND_IP"
echo "Support Worker IP: $WORKER_SUPPORT_IP"
echo "SSH Key:           $SSH_KEY"
echo "======================================================================"

# Ensure proper private key permissions on Unix-like systems
chmod 400 "$SSH_KEY" || true

# ── Step 1: Install K3s Control Plane on Master ─────────────────────────────
echo "👑 Step 1: Installing K3s Master Control Plane on $MASTER_IP..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$MASTER_IP << EOF
  sudo curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="v1.30.1+k3s1" sh -s - \
    --write-kubeconfig-mode 644 \
    --disable traefik \
    --cluster-cidr 10.42.0.0/16 \
    --service-cidr 10.43.0.0/16 \
    --tls-san "$MASTER_IP"
  
  # Wait for API server to come online
  until kubectl get nodes &> /dev/null; do
    echo "Waiting for Kubernetes API Server..."
    sleep 3
  done
  echo "✅ K3s Master successfully initialized!"
EOF

# ── Step 2: Retrieve Cluster Credentials & Token ───────────────────────────
echo "🔑 Step 2: Retrieving cluster join token and private endpoint..."
K3S_TOKEN=$(ssh -i "$SSH_KEY" ubuntu@$MASTER_IP "sudo cat /var/lib/rancher/k3s/server/node-token")
MASTER_PRIVATE_IP=$(ssh -i "$SSH_KEY" ubuntu@$MASTER_IP "hostname -I | awk '{print \$1}'")

echo "🔑 Token retrieved! Private IP of Master: $MASTER_PRIVATE_IP"

# ── Step 3: Provision Worker Nodes ──────────────────────────────────────────
echo "🧠 Step 3: Provisioning Worker Nodes..."

# 3.1 AI Node
echo "⚡ Joining AI Worker node ($WORKER_AI_IP)..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_AI_IP << EOF
  sudo curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_PRIVATE_IP:6443 K3S_TOKEN=$K3S_TOKEN sh -s -
  echo "✅ AI Worker successfully joined!"
EOF

# 3.2 Backend Node
echo "⚡ Joining Backend Worker node ($WORKER_BACKEND_IP)..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_BACKEND_IP << EOF
  sudo curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_PRIVATE_IP:6443 K3S_TOKEN=$K3S_TOKEN sh -s -
  echo "✅ Backend Worker successfully joined!"
EOF

# 3.3 Support Node
echo "⚡ Joining Support Worker node ($WORKER_SUPPORT_IP)..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_SUPPORT_IP << EOF
  sudo curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_PRIVATE_IP:6443 K3S_TOKEN=$K3S_TOKEN sh -s -
  echo "✅ Support Worker successfully joined!"
EOF

# ── Step 4: Apply Kubernetes Labels & Annotations ──────────────────────────
echo "🏷️ Step 4: Applying workload scheduling labels on Master..."

# Retrieve system hostnames from nodes (these are registered directly as Kubernetes node names)
AI_NODE=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_AI_IP "hostname")
BACKEND_NODE=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_BACKEND_IP "hostname")
SUPPORT_NODE=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@$WORKER_SUPPORT_IP "hostname")

echo "Targeting Hostnames: AI=$AI_NODE, Backend=$BACKEND_NODE, Support=$SUPPORT_NODE"

ssh -i "$SSH_KEY" ubuntu@$MASTER_IP << EOF
  # Wait for all nodes to report as Ready
  echo "Waiting for all nodes to report Ready status..."
  sleep 15
  
  # Label the nodes
  kubectl label node "$AI_NODE" node-role.kubernetes.io/worker=ai --overwrite
  kubectl label node "$BACKEND_NODE" node-role.kubernetes.io/worker=backend --overwrite
  kubectl label node "$SUPPORT_NODE" node-role.kubernetes.io/worker=support --overwrite

  # Setup standard namespaces
  kubectl create namespace production || true
  kubectl create namespace staging || true
  kubectl create namespace monitoring || true
  
  # Deploy Nginx Ingress Controller on Support Node
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

  echo "Cluster Nodes:"
  kubectl get nodes -o wide
EOF

# ── Step 5: Save Local Kubeconfig ───────────────────────────────────────────
echo "💾 Step 5: Copying kubeconfig for local cluster access..."
scp -i "$SSH_KEY" ubuntu@$MASTER_IP:/etc/rancher/k3s/k3s.yaml chatflow-k3s.yaml
sed -i "s/127.0.0.1/$MASTER_IP/g" chatflow-k3s.yaml

echo "======================================================================"
echo "🎉 Congratulations! ChatFlow Multi-Node K3s Cluster is Live!"
echo "======================================================================"
echo "Local kubeconfig saved to: ./ansible/chatflow-k3s.yaml"
echo "Deploy using: export KUBECONFIG=./ansible/chatflow-k3s.yaml"
echo "======================================================================"
