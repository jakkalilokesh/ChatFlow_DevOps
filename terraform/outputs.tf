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
