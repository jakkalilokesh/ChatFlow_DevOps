output "jenkins_public_ip" {
  description = "Public IP of the Jenkins server"
  value       = aws_instance.jenkins.public_ip
}

output "k3s_public_ip" {
  description = "Public IP of the k3s node (may change on restart)"
  value       = aws_instance.k3s.public_ip
}

output "k3s_elastic_ip" {
  description = "Static Elastic IP of the k3s node (use this for DNS)"
  value       = aws_eip.k3s.public_ip
}

output "ecr_registry_url" {
  description = "ECR registry URL base (account.dkr.ecr.region.amazonaws.com)"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs for each service"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "s3_state_bucket" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.tf_state.bucket
}

output "s3_backup_bucket" {
  description = "S3 bucket name for application backups"
  value       = aws_s3_bucket.app_backups.bucket
}

output "ssh_command_jenkins" {
  description = "SSH command to connect to Jenkins server"
  value       = "ssh -i ~/.ssh/chat-app-key ubuntu@${aws_instance.jenkins.public_ip}"
}

output "ssh_command_k3s" {
  description = "SSH command to connect to k3s server"
  value       = "ssh -i ~/.ssh/chat-app-key ubuntu@${aws_eip.k3s.public_ip}"
}

output "app_url" {
  description = "Application URL via Elastic IP"
  value       = "http://${aws_eip.k3s.public_ip}"
}

output "jenkins_url" {
  description = "Jenkins CI URL"
  value       = "http://${aws_instance.jenkins.public_ip}:8080"
}
