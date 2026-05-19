resource "aws_ecr_repository" "services" {
  for_each             = toset(["auth-service", "chat-service", "user-service", "notification-service", "call-service", "ai-service"])
  name                 = "chat-app-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
