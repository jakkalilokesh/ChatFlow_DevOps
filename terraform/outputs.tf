output "s3_state_bucket" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.tf_state.bucket
}

output "s3_backup_bucket" {
  description = "S3 bucket name for application backups"
  value       = aws_s3_bucket.app_backups.bucket
}



output "rds_endpoint" {
  description = "PostgreSQL RDS Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "s3_access_key_id" {
  description = "IAM Access Key ID for S3 uploads"
  value       = aws_iam_access_key.s3_media_key.id
}

output "s3_secret_access_key" {
  description = "IAM Secret Access Key for S3 uploads"
  value       = aws_iam_access_key.s3_media_key.secret
  sensitive   = true
}

output "jenkins_ip" {
  description = "Public IP of the Jenkins server"
  value       = aws_instance.jenkins.public_ip
}

output "k3s_master_ip" {
  description = "Public IP of the K3s Master"
  value       = aws_instance.k3s_master.public_ip
}

output "k3s_worker_ai_ip" {
  description = "Public IP of the AI Worker node"
  value       = aws_instance.k3s_worker_ai.public_ip
}

output "k3s_worker_backend_ip" {
  description = "Public IP of the Backend Worker node"
  value       = aws_instance.k3s_worker_backend.public_ip
}

output "k3s_worker_support_ip" {
  description = "Public IP of the Support Worker node"
  value       = aws_instance.k3s_worker_support.public_ip
}

