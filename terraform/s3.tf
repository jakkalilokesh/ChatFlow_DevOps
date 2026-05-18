resource "random_id" "suffix" {
  byte_length = 4
}

# ── Terraform State Bucket ───────────────────────────────
resource "aws_s3_bucket" "tf_state" {
  bucket        = "${var.project_name}-tfstate-${random_id.suffix.hex}"
  force_destroy = false
  tags          = { Name = "${var.project_name}-tfstate", Purpose = "TerraformState" }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    id     = "delete-noncurrent-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ── App Backups Bucket ───────────────────────────────────
resource "aws_s3_bucket" "app_backups" {
  bucket        = "${var.project_name}-backups-${random_id.suffix.hex}"
  force_destroy = true
  tags          = { Name = "${var.project_name}-backups", Purpose = "AppBackups" }
}

resource "aws_s3_bucket_public_access_block" "app_backups" {
  bucket                  = aws_s3_bucket.app_backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "app_backups" {
  bucket = aws_s3_bucket.app_backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    filter {}
    expiration {
      days = 7
    }
  }
}

# ── Media Assets Bucket (Replaces MinIO) ────────────────
resource "aws_s3_bucket" "media_assets" {
  bucket        = "${var.project_name}-media-${random_id.suffix.hex}"
  force_destroy = true
  tags          = { Name = "${var.project_name}-media", Purpose = "AppMedia" }
}

resource "aws_s3_bucket_cors_configuration" "media_cors" {
  bucket = aws_s3_bucket.media_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

output "s3_media_bucket" {
  description = "S3 Bucket for Media Assets"
  value       = aws_s3_bucket.media_assets.bucket
}

