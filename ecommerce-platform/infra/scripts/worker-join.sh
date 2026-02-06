#!/bin/bash
# ============================================================
# Worker Node Join Script
# Run this on each worker EC2 instance AFTER user_data has
# completed and the control plane is initialized.
#
# Usage: sudo bash worker-join.sh <JOIN_COMMAND>
# The join command is printed by control-plane-init.sh
# ============================================================
set -euxo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: sudo bash worker-join.sh <kubeadm join command>"
  echo "Get the join command from the control plane node."
  exit 1
fi

echo "================================================"
echo "  Joining Kubernetes Cluster as Worker"
echo "================================================"

# Execute the join command passed as argument
$@

echo ""
echo "================================================"
echo "  Worker node joined the cluster!"
echo "  Verify on control plane: kubectl get nodes"
echo "================================================"
