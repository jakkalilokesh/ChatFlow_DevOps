# ==============================================================================
# ChatFlow — Automated Multi-Node K3s Cluster Deployment (Windows PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configured node IP addresses from Terraform outputs
$MASTER_IP = "34.234.215.6"
$WORKER_AI_IP = "44.193.213.221"
$WORKER_BACKEND_IP = "44.211.253.76"
$WORKER_SUPPORT_IP = "44.203.161.187"

$SSH_KEY = "test.pem"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 Initializing ChatFlow Multi-Node K3s Cluster Deployment (Windows)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Master IP:         $MASTER_IP"
Write-Host "AI Worker IP:      $WORKER_AI_IP"
Write-Host "Backend Worker IP: $WORKER_BACKEND_IP"
Write-Host "Support Worker IP: $WORKER_SUPPORT_IP"
Write-Host "SSH Key:           $SSH_KEY"
Write-Host "======================================================================" -ForegroundColor Cyan

# Configure SSH key permissions if needed (Windows SSH Client requires closed permissions or bypass warnings)
# Strict Host Key checking disabled for easy automation
$ssh_opts = @("-o", "StrictHostKeyChecking=no", "-i", $SSH_KEY)

# ── Step 1: Install K3s Control Plane on Master ─────────────────────────────
Write-Host "👑 Step 1: Installing K3s Master Control Plane on $MASTER_IP..." -ForegroundColor Yellow
ssh $ssh_opts ubuntu@$MASTER_IP "sudo curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION='v1.30.1+k3s1' sh -s - --write-kubeconfig-mode 644 --disable traefik --cluster-cidr 10.42.0.0/16 --service-cidr 10.43.0.0/16"

# Wait for master api server to boot
Write-Host "Waiting for Master API server to boot..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# ── Step 2: Retrieve Cluster Credentials & Token ───────────────────────────
Write-Host "🔑 Step 2: Retrieving cluster join token and private endpoint..." -ForegroundColor Yellow
$K3S_TOKEN = ssh $ssh_opts ubuntu@$MASTER_IP "sudo cat /var/lib/rancher/k3s/server/node-token"
$K3S_TOKEN = $K3S_TOKEN.Trim()
$MASTER_PRIVATE_IP = ssh $ssh_opts ubuntu@$MASTER_IP "hostname -I | awk '{print `$1}'"
$MASTER_PRIVATE_IP = $MASTER_PRIVATE_IP.Trim().Split(" ")[0]

Write-Host "🔑 Token retrieved! Private IP of Master: $MASTER_PRIVATE_IP" -ForegroundColor Green

# ── Step 3: Provision Worker Nodes ──────────────────────────────────────────
Write-Host "🧠 Step 3: Provisioning Worker Nodes..." -ForegroundColor Yellow

# 3.1 AI Node
Write-Host "⚡ Joining AI Worker node ($WORKER_AI_IP)..." -ForegroundColor Yellow
ssh $ssh_opts ubuntu@$WORKER_AI_IP "sudo env K3S_URL=https://${MASTER_PRIVATE_IP}:6443 K3S_TOKEN=${K3S_TOKEN} sh -c 'curl -sfL https://get.k3s.io | sh -s -'"
Write-Host "✅ AI Worker successfully joined!" -ForegroundColor Green

# 3.2 Backend Node
Write-Host "⚡ Joining Backend Worker node ($WORKER_BACKEND_IP)..." -ForegroundColor Yellow
ssh $ssh_opts ubuntu@$WORKER_BACKEND_IP "sudo env K3S_URL=https://${MASTER_PRIVATE_IP}:6443 K3S_TOKEN=${K3S_TOKEN} sh -c 'curl -sfL https://get.k3s.io | sh -s -'"
Write-Host "✅ Backend Worker successfully joined!" -ForegroundColor Green

# 3.3 Support Node
Write-Host "⚡ Joining Support Worker node ($WORKER_SUPPORT_IP)..." -ForegroundColor Yellow
ssh $ssh_opts ubuntu@$WORKER_SUPPORT_IP "sudo env K3S_URL=https://${MASTER_PRIVATE_IP}:6443 K3S_TOKEN=${K3S_TOKEN} sh -c 'curl -sfL https://get.k3s.io | sh -s -'"
Write-Host "✅ Support Worker successfully joined!" -ForegroundColor Green

# ── Step 4: Apply Kubernetes Labels & Annotations ──────────────────────────
Write-Host "🏷️ Step 4: Applying workload scheduling labels on Master..." -ForegroundColor Yellow
Write-Host "Waiting for all nodes to report Ready status..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Copy helper setup script to master node
Write-Host "📤 Copying cluster label script to Master..." -ForegroundColor Gray
scp $ssh_opts setup_k3s.sh ubuntu@${MASTER_IP}:/home/ubuntu/setup_k3s.sh

# Run the helper script on master
Write-Host "🚀 Executing label and ingress configurations on Master..." -ForegroundColor Gray
ssh $ssh_opts ubuntu@${MASTER_IP} "bash /home/ubuntu/setup_k3s.sh $WORKER_AI_IP $WORKER_BACKEND_IP $WORKER_SUPPORT_IP"

# ── Step 5: Save Local Kubeconfig ───────────────────────────────────────────
Write-Host "💾 Step 5: Copying kubeconfig for local cluster access..." -ForegroundColor Yellow
scp -i $SSH_KEY ubuntu@${MASTER_IP}:/etc/rancher/k3s/k3s.yaml chatflow-k3s.yaml

# Clean up local config file replacing 127.0.0.1 with Master Public IP
$content = Get-Content -Path chatflow-k3s.yaml
$content = $content -replace '127.0.0.1', $MASTER_IP
$content | Set-Content -Path chatflow-k3s.yaml

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "🎉 Congratulations! ChatFlow Multi-Node K3s Cluster is Live!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Local kubeconfig saved to: ./ansible/chatflow-k3s.yaml" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green

