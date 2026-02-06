# Security Module – Outputs
output "control_plane_sg_id" {
  value = aws_security_group.control_plane.id
}

output "worker_sg_id" {
  value = aws_security_group.worker.id
}
