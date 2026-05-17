# 💬 ChatFlow — Real-Time Chat Application (DevOps Edition)

> A production-grade, microservices-based real-time chat platform with full CI/CD, container orchestration, and observability stack.

[![CI](https://img.shields.io/badge/CI-Jenkins-D33833?logo=jenkins&logoColor=white)](#)
[![K8s](https://img.shields.io/badge/Orchestration-k3s-326CE5?logo=kubernetes&logoColor=white)](#)
[![AWS](https://img.shields.io/badge/Cloud-AWS%20Free%20Tier-FF9900?logo=amazonaws&logoColor=white)](#)
[![IaC](https://img.shields.io/badge/IaC-Terraform-7B42BC?logo=terraform&logoColor=white)](#)
[![Ansible](https://img.shields.io/badge/Config-Ansible-EE0000?logo=ansible&logoColor=white)](#)

---

## 📐 Architecture

```
Browser → Nginx Gateway (80)
              ├── /auth         → Auth Service     (3001) → PostgreSQL + Redis
              ├── /api/chat     → Chat Service     (3002) → MongoDB + Redis
              ├── /socket.io    → Chat Service     (3002) ← WebSocket
              ├── /api/users    → User Service     (3003) → PostgreSQL + Redis + S3
              ├── /api/notify   → Notification Svc (3004) → Redis
              └── /             → React Frontend   (3000)
```

## 🗂️ Project Structure

```
Real_Time_Chat_App/
├── frontend/              # React.js SPA
├── auth-service/          # JWT authentication (Node.js + PostgreSQL + Redis)
├── chat-service/          # Real-time messaging (Node.js + Socket.io + MongoDB)
├── user-service/          # User profiles & avatar (Node.js + PostgreSQL + S3)
├── notification-service/  # Presence & status (Node.js + Socket.io + Redis)
├── nginx/                 # API Gateway (Nginx reverse proxy)
├── terraform/             # AWS infrastructure (VPC, EC2, ECR, S3, DynamoDB, IAM)
├── ansible/               # Server config (Jenkins + k3s setup playbooks)
├── jenkins/               # Jenkinsfile CI/CD pipeline
├── kubernetes/
│   ├── namespaces/        # production, staging, monitoring
│   ├── deployments/       # All K8s Deployments
│   ├── services/          # ClusterIP Services
│   ├── ingress/           # Nginx Ingress
│   ├── configmaps/        # Application config
│   ├── hpa/               # Horizontal Pod Autoscaler
│   ├── storage/           # PersistentVolumeClaims
│   └── monitoring/        # Prometheus, Grafana, Loki, Promtail, Alertmanager
└── scripts/               # Automation shell scripts
```

## ✨ Features

| Category | Details |
|---|---|
| **Frontend** | React 18, Framer Motion, Socket.io client, glassmorphism UI |
| **Auth** | JWT access tokens (15m) + Redis-backed refresh tokens (7d), bcrypt |
| **Chat** | Socket.io rooms, message reactions, reply threads, typing indicators |
| **Users** | Avatar upload to S3, profile editing, online search |
| **Presence** | Real-time online/offline via Socket.io + Redis hash |
| **DevOps** | Docker multi-stage builds, k3s, Jenkins CI/CD, Terraform, Ansible |
| **Monitoring** | Prometheus + Grafana + Loki + Promtail + Alertmanager |

---

## 🚀 Quick Start (Local — Docker Compose)

### Prerequisites
- Docker Desktop ≥ 4.x
- Node.js 18+

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/chatflow.git
cd chatflow
chmod +x scripts/*.sh
./scripts/setup.sh
```

The setup script will:
- Copy `.env.example` → `.env`
- Install all npm dependencies
- Build and start all services via Docker Compose

**App runs at: `http://localhost`**

### 2. Manual startup (alternative)
```bash
cp .env.example .env
# Edit .env with your values
docker compose up --build -d
docker compose logs -f
```

---

## ☁️ AWS Deployment

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform ≥ 1.6
- Ansible ≥ 2.15
- SSH key pair at `~/.ssh/chat-app-key`

### Step 1 — Provision AWS Infrastructure
```bash
cd terraform

# First time: bootstrap state bucket manually, then configure backend
terraform init -backend-config="bucket=<your-bucket>" \
               -backend-config="key=prod/terraform.tfstate" \
               -backend-config="region=us-east-1"

terraform plan -var="my_ip=$(curl -s ifconfig.me)/32"
terraform apply -var="my_ip=$(curl -s ifconfig.me)/32" -auto-approve

# Note the outputs
terraform output
```

### Step 2 — Configure Servers with Ansible
```bash
cd ../ansible

# Update inventory.ini with Terraform outputs
# JENKINS_PUBLIC_IP  → terraform output jenkins_public_ip
# K3S_ELASTIC_IP     → terraform output k3s_elastic_ip

# Install Jenkins on Jenkins server
ansible-playbook playbooks/jenkins.yml -l jenkins

# Install k3s on k3s server
ansible-playbook playbooks/k3s.yml -l k3s
```

### Step 3 — Create Kubernetes Secrets
```bash
# Edit .env with production values first
export KUBECONFIG=~/.kube/chatflow-k3s.yaml
./scripts/create-k8s-secrets.sh production
./scripts/create-k8s-secrets.sh staging
```

### Step 4 — Build & Push Images to ECR
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
./scripts/build-push-ecr.sh v1.0.0
```

### Step 5 — Deploy to Kubernetes
```bash
export KUBECONFIG=~/.kube/chatflow-k3s.yaml

# Apply monitoring stack
kubectl apply -f kubernetes/monitoring/ -n monitoring

# Deploy application
./scripts/deploy.sh production v1.0.0
./scripts/health-check.sh production
```

**App live at: `http://<k3s-elastic-ip>`**
**Grafana at: `http://<k3s-elastic-ip>:32000`**

---

## 🔧 Jenkins CI/CD

### Required Jenkins Credentials
| ID | Type | Value |
|---|---|---|
| `aws-account-id` | Secret text | Your AWS Account ID |
| `kubeconfig` | Secret file | `~/.kube/chatflow-k3s.yaml` |

### Pipeline Stages
```
Checkout → Lint (parallel) → Unit Tests (parallel) → Build Images (parallel)
  → Security Scan (Trivy) → Push to ECR → Deploy to Staging
  → Integration Tests → [Manual Approval] → Deploy to Production
  → Health Check → Notify
```

Auto-rollback triggers on any deployment failure.

---

## 📊 Monitoring Stack

| Tool | URL | Purpose |
|---|---|---|
| Grafana | `:32000` | Dashboards (admin/changeme) |
| Prometheus | Internal | Metrics scraping |
| Loki | Internal | Log aggregation |
| Alertmanager | Internal | Alert routing → email |

### Pre-configured Alerts
- Pod crash-looping
- Node memory > 85%
- Service down > 2 minutes
- HTTP 5xx error rate > 5%

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

Key variables to set:
- `JWT_SECRET` — min 64 random chars
- `JWT_REFRESH_SECRET` — min 64 random chars (different from above)
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MONGO_INITDB_ROOT_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

> ⚠️ **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

## 📜 Scripts Reference

| Script | Usage | Description |
|---|---|---|
| `setup.sh` | `./scripts/setup.sh` | Full local dev setup |
| `deploy.sh` | `./scripts/deploy.sh production v1.0.0` | Rolling deploy to k8s |
| `rollback.sh` | `./scripts/rollback.sh production` | Roll back all deployments |
| `health-check.sh` | `./scripts/health-check.sh production` | Verify all services healthy |
| `build-push-ecr.sh` | `./scripts/build-push-ecr.sh v1.0.0` | Build & push to ECR |
| `create-k8s-secrets.sh` | `./scripts/create-k8s-secrets.sh production` | Create K8s secrets from `.env` |

---

## 🛠️ Technology Stack

**Frontend:** React 18, React Router v6, Framer Motion, Socket.io Client, Axios, date-fns, emoji-picker-react

**Backend:** Node.js 18, Express 4, Socket.io 4, JWT, bcryptjs, Joi, Winston, prom-client

**Databases:** PostgreSQL 15 (users/auth), MongoDB 6 (messages), Redis 7 (sessions/presence/pub-sub)

**DevOps:** Docker, Docker Compose, Terraform, Ansible, Jenkins, k3s, Nginx

**Monitoring:** Prometheus, Grafana, Loki, Promtail, Alertmanager, Node Exporter

**Cloud:** AWS EC2 (t2.micro Free Tier), S3, ECR, DynamoDB, IAM, VPC

---

## 📄 License

MIT © 2024 ChatFlow
