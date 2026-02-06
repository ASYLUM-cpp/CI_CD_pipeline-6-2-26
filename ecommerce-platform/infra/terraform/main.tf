# ============================================================
# Terraform – Root Main Configuration
# Provisions a VPC, Security Groups, and EC2 instances for
# a self-managed Kubernetes cluster (kubeadm).
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ecommerce-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ---- VPC Module ----
module "vpc" {
  source = "./vpc"

  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = var.availability_zones
  environment         = var.environment
}

# ---- Security Module ----
module "security" {
  source = "./security"

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
  my_ip       = var.my_ip
}

# ---- EC2 Module (Kubernetes Nodes) ----
module "ec2" {
  source = "./ec2"

  environment           = var.environment
  public_subnet_id      = module.vpc.public_subnet_ids[0]
  control_plane_sg_id   = module.security.control_plane_sg_id
  worker_sg_id          = module.security.worker_sg_id
  key_name              = var.key_name
  control_plane_instance_type = var.control_plane_instance_type
  worker_instance_type  = var.worker_instance_type
  worker_count          = var.worker_count
  ami_id                = var.ami_id
}
