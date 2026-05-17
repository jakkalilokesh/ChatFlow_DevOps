data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "chatflow" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.ssh_public_key_path)
  tags       = { Name = "${var.project_name}-keypair" }
}

# ── Jenkins EC2 ──────────────────────────────────────────
resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.jenkins_sg.id]
  key_name               = aws_key_pair.chatflow.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
    tags                  = { Name = "${var.project_name}-jenkins-disk" }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -qq
    apt-get install -y wget curl
  EOF
  )

  tags = { Name = "${var.project_name}-jenkins" }
}

# ── k3s EC2 ─────────────────────────────────────────────
resource "aws_instance" "k3s" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.k3s_sg.id]
  key_name               = aws_key_pair.chatflow.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_type           = "gp2"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
    tags                  = { Name = "${var.project_name}-k3s-disk" }
  }

  tags = { Name = "${var.project_name}-k3s" }
}

resource "aws_eip" "k3s" {
  instance = aws_instance.k3s.id
  domain   = "vpc"
  tags     = { Name = "${var.project_name}-k3s-eip" }
}
