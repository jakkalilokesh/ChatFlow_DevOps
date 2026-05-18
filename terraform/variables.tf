variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "chat-app"
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro for AWS Free Tier)"
  type        = string
  default     = "t2.micro"
}

variable "my_ip" {
  description = "Your public IP address for SSH access — format: x.x.x.x/32"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to your SSH public key file"
  type        = string
  default     = "~/.ssh/chat-app-key.pub"
}

variable "db_password" {
  description = "Password for PostgreSQL RDS"
  type        = string
  sensitive   = true
}

variable "mongo_password" {
  description = "Password for MongoDB/DocumentDB"
  type        = string
  sensitive   = true
}

