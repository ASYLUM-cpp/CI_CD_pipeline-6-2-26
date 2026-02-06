# Security Module – Variables
variable "vpc_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "my_ip" {
  description = "Your public IP CIDR for SSH access"
  type        = string
}
