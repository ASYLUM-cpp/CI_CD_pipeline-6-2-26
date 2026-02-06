#!/bin/bash
# ============================================================
# Setup RBAC for Kubernetes Namespaces
# Creates service accounts and role bindings for each namespace.
# Run on control plane after cluster initialization.
#
# Usage: bash setup-rbac.sh
# ============================================================
set -euxo pipefail

echo ">>> Setting up RBAC..."

# ---- Dev Namespace RBAC ----
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dev-deployer
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dev-deployer-role
  namespace: dev
rules:
  - apiGroups: ["", "apps", "networking.k8s.io", "autoscaling"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-deployer-binding
  namespace: dev
subjects:
  - kind: ServiceAccount
    name: dev-deployer
    namespace: dev
roleRef:
  kind: Role
  name: dev-deployer-role
  apiGroup: rbac.authorization.k8s.io
EOF

# ---- Staging Namespace RBAC ----
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: staging-deployer
  namespace: staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: staging-deployer-role
  namespace: staging
rules:
  - apiGroups: ["", "apps", "networking.k8s.io", "autoscaling"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: staging-deployer-binding
  namespace: staging
subjects:
  - kind: ServiceAccount
    name: staging-deployer
    namespace: staging
roleRef:
  kind: Role
  name: staging-deployer-role
  apiGroup: rbac.authorization.k8s.io
EOF

# ---- Prod Namespace RBAC ----
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prod-deployer
  namespace: prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prod-deployer-role
  namespace: prod
rules:
  - apiGroups: ["", "apps", "networking.k8s.io", "autoscaling"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prod-deployer-binding
  namespace: prod
subjects:
  - kind: ServiceAccount
    name: prod-deployer
    namespace: prod
roleRef:
  kind: Role
  name: prod-deployer-role
  apiGroup: rbac.authorization.k8s.io
EOF

echo ">>> RBAC setup complete for dev, staging, and prod namespaces"
