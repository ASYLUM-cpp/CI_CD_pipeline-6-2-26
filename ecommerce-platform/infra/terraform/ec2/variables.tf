# EC2 Module – Variables
variable "environment" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "control_plane_sg_id" {
  type = string
}

variable "worker_sg_id" {
  type = string
}

variable "key_name" {
  type = string
}

variable "control_plane_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "worker_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "worker_count" {
  type    = number
  default = 2
}

variable "ami_id" {
  type = string
}
