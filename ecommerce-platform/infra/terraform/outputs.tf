# ============================================================
# Terraform Outputs
# Exposes key resource identifiers and IPs after apply.
# ============================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "control_plane_public_ip" {
  description = "Public IP of the Kubernetes control plane node"
  value       = module.ec2.control_plane_public_ip
}

output "control_plane_private_ip" {
  description = "Private IP of the Kubernetes control plane node"
  value       = module.ec2.control_plane_private_ip
}

output "worker_public_ips" {
  description = "Public IPs of the Kubernetes worker nodes"
  value       = module.ec2.worker_public_ips
}

output "worker_private_ips" {
  description = "Private IPs of the Kubernetes worker nodes"
  value       = module.ec2.worker_private_ips
}

output "ssh_command_control_plane" {
  description = "SSH command to connect to the control plane"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${module.ec2.control_plane_public_ip}"
}
