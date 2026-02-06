# ============================================================
# EC2 Module – Kubernetes Nodes
# Provisions 1 control plane + N worker EC2 instances with
# user_data scripts that install containerd and kubeadm.
# ============================================================

# ---- Control Plane Node ----
resource "aws_instance" "control_plane" {
  ami                    = var.ami_id
  instance_type          = var.control_plane_instance_type
  key_name               = var.key_name
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.control_plane_sg_id]

  # Ensure public IP for SSH access
  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/scripts/common-setup.sh", {
    node_role = "control-plane"
  })

  tags = {
    Name = "${var.environment}-k8s-control-plane"
    Role = "control-plane"
  }
}

# ---- Worker Nodes ----
resource "aws_instance" "worker" {
  count                  = var.worker_count
  ami                    = var.ami_id
  instance_type          = var.worker_instance_type
  key_name               = var.key_name
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.worker_sg_id]

  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/scripts/common-setup.sh", {
    node_role = "worker"
  })

  tags = {
    Name = "${var.environment}-k8s-worker-${count.index + 1}"
    Role = "worker"
  }
}
