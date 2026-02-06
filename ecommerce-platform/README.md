# E-Commerce Microservices Platform

A production-ready, DevOps-enabled microservices e-commerce platform deployed on AWS using Terraform-provisioned, self-managed Kubernetes (kubeadm).

## Architecture

```
                    ┌─────────────┐
                    │   Frontend   │  React SPA
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ NGINX Ingress│
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │ User Service │ │ Product  │ │Order Service│
     │  (Node.js)  │ │ Service  │ │  (FastAPI)  │
     └──────┬──────┘ │(Node.js) │ └──────┬──────┘
            │        └────┬─────┘        │
            │             │              │
            │      ┌──────▼──────┐       │
            │      │   Payment   │       │
            │      │  Service    │       │
            │      │  (FastAPI)  │       │
            │      └──────┬──────┘       │
            │             │              │
     ┌──────▼─────────────▼──────────────▼──────┐
     │              RabbitMQ                     │
     └──────┬─────────────┬──────────────┬──────┘
            │             │              │
     ┌──────▼──────┐ ┌───▼────┐  ┌──────▼──────┐
     │ PostgreSQL  │ │ Redis  │  │ Prometheus  │
     └─────────────┘ └────────┘  │ + Grafana   │
                                 └─────────────┘
```

## Services

| Service         | Tech Stack       | Port |
|-----------------|------------------|------|
| Frontend        | React 18         | 3000 |
| User Service    | Node.js/Express  | 3001 |
| Product Service | Node.js/Express  | 3002 |
| Order Service   | Python/FastAPI   | 8001 |
| Payment Service | Python/FastAPI   | 8002 |

## Infrastructure

- **Cloud**: AWS (Free Tier Friendly)
- **IaC**: Terraform
- **Container Orchestration**: Self-managed Kubernetes via kubeadm
- **Compute**: EC2 instances (1 control plane + 2 workers)
- **Networking**: VPC with public/private subnets
- **CNI**: Calico
- **Ingress**: NGINX Ingress Controller

## Quick Start

### 1. Provision Infrastructure
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```
> **Note**: Uses `bastion-11-1-26.pem` key pair (located in project root `../bastion-11-1-26.pem`)

### 2. Bootstrap Kubernetes
SSH into control plane node:
```bash
ssh -i bastion-11-1-26.pem ubuntu@<CONTROL_PLANE_IP>
sudo bash /tmp/control-plane-init.sh
```

### 3. Join Workers
SSH into each worker node and run the join command from step 2.

### 4. Deploy Services
```bash
kubectl apply -k infra/k8s/dev/
```

## CI/CD

GitHub Actions workflows handle:
- **CI**: Lint, test, build Docker images, push to registry
- **CD**: Deploy to dev (develop branch) or prod (main branch)

### Required GitHub Secrets
| Secret | Value |
|--------|-------|
| `EC2_SSH_KEY` | Contents of `bastion-11-1-26.pem` |
| `DOCKER_PASSWORD` | `Amazon1Seller@@` |
| `CONTROL_PLANE_IP` | EC2 control plane public IP (from terraform output) |

> Docker Hub username `asylums` is hardcoded in workflows.

## Observability

- **Metrics**: Prometheus + Grafana
- **Logs**: Loki stack
- **Alerts**: Preconfigured alerting rules

## License

MIT
