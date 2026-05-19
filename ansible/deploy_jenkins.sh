#!/bin/bash
# ==============================================================================
# ChatFlow — K3s Master Node Jenkins & CI/CD Infrastructure Provisioner
# ==============================================================================

set -e

echo "======================================================================"
echo "🚀 Initializing Master CI/CD Infrastructure Setup"
echo "======================================================================"

# ── Step 1: Install Docker CE ────────────────────────────────────────────────
echo "🐳 Step 1: Installing Docker CE..."
sudo apt-get update -y
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release unzip

# Import Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

echo "deb [arch=$(dpkg --print-architecture)] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

echo "✅ Docker successfully installed!"

# ── Step 2: Install Java 21 & Jenkins ────────────────────────────────────────
echo "👑 Step 2: Installing Java 21 and Jenkins..."
sudo apt-get install -y openjdk-21-jdk

# Import Jenkins GPG key
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo apt-key add -

echo "deb https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y jenkins

sudo systemctl daemon-reload
sudo systemctl start jenkins
sudo systemctl enable jenkins
sudo usermod -aG docker jenkins

echo "✅ Jenkins successfully installed!"

# ── Step 3: Install AWS CLI ────────────────────────────────────────────────
echo "📦 Step 3: Installing AWS CLI v2..."
if ! command -v aws &> /dev/null; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip -q awscliv2.zip
  sudo ./aws/install
  rm -rf awscliv2.zip aws
  echo "✅ AWS CLI installed!"
else
  echo "✅ AWS CLI already installed!"
fi

# ── Step 4: Install Helm & Kubectl ──────────────────────────────────────────
echo "☸️ Step 4: Installing Helm and Kubectl..."
# Install Kubectl matching the local cluster version
KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
sudo curl -Lo /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
sudo chmod +x /usr/local/bin/kubectl

# Install Helm 3
if ! command -v helm &> /dev/null; then
  curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
  chmod 700 get_helm.sh
  ./get_helm.sh
  rm get_helm.sh
fi

echo "✅ Helm & Kubectl successfully installed!"

# ── Step 5: Configure Jenkins Kubeconfig Integration ───────────────────────
echo "⚙️ Step 5: Linking K3s cluster credentials to Jenkins user..."
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
sudo chmod 600 /var/lib/jenkins/.kube/config

echo "✅ Kubeconfig successfully linked!"

# ── Step 6: Fetch Access Credentials ────────────────────────────────────────
echo "======================================================================"
echo "🎉 Jenkins & CI/CD Infrastructure is Fully Installed!"
echo "======================================================================"
echo "URL: http://$(curl -s ifconfig.me):8080"
echo "----------------------------------------------------------------------"
echo "🔒 Initial Admin Password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
echo "======================================================================"
