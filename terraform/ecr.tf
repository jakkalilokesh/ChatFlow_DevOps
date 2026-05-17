locals {
  ecr_services = toset([
    "frontend",
    "auth-service",
    "chat-service",
    "user-service",
    "notification-service",
    "call-service"
  ])
}

resource "aws_ecr_repository" "services" {
  for_each             = local.ecr_services
  name                 = "${var.project_name}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${var.project_name}-${each.key}-ecr" }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 3 images, expire older ones"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 3
      }
      action = { type = "expire" }
    }]
  })
}
