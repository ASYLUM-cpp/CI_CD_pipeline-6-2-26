#!/bin/bash
# ============================================================
# Control Plane Initialization Script
# Run this on the control plane EC2 instance AFTER user_data
# has completed. Initializes the Kubernetes cluster, installs
# Calico CNI, and sets up NGINX Ingress Controller.
#
# Usage: sudo bash control-plane-init.sh
# ============================================================
set -euxo pipefail

CONTROL_PLANE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
POD_CIDR="192.168.0.0/16"  # Default for Calico

echo "================================================"
echo "  Initializing Kubernetes Control Plane"
echo "  Private IP: $CONTROL_PLANE_IP"
echo "  Public IP:  $PUBLIC_IP"
echo "================================================"

# ---- 1. Initialize kubeadm ----
kubeadm init \
  --apiserver-advertise-address="$CONTROL_PLANE_IP" \
  --apiserver-cert-extra-sans="$PUBLIC_IP" \
  --pod-network-cidr="$POD_CIDR" \
  --node-name="$(hostname)" \
  --ignore-preflight-errors=NumCPU

# ---- 2. Configure kubectl for the ubuntu user ----
mkdir -p /home/ubuntu/.kube
cp /etc/kubernetes/admin.conf /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config

# Also set up for root
export KUBECONFIG=/etc/kubernetes/admin.conf

# ---- 3. Install Calico CNI ----
echo ">>> Installing Calico CNI..."
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Wait for Calico to be ready
echo ">>> Waiting for Calico pods..."
sleep 30
kubectl wait --for=condition=ready pod -l k8s-app=calico-node -n kube-system --timeout=300s || true

# ---- 4. Install NGINX Ingress Controller ----
echo ">>> Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/baremetal/deploy.yaml

# ---- 5. Create Namespaces ----
echo ">>> Creating namespaces..."
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -

# ---- 6. Install Metrics Server (for HPA) ----
echo ">>> Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch metrics-server to work with self-signed certs
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]' || true

# ---- 7. Print Join Command ----
echo ""
echo "================================================"
echo "  Kubernetes Control Plane Initialized!"
echo "================================================"
echo ""
echo ">>> WORKER JOIN COMMAND (run this on each worker node):"
echo ""
kubeadm token create --print-join-command
echo ""
echo "================================================"
echo ">>> To use kubectl as ubuntu user:"
echo "    export KUBECONFIG=/home/ubuntu/.kube/config"
echo "================================================"
