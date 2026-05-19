data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_key_pair" "key" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.ssh_public_key_path)
}

# 👑 K3s Master Control Plane
resource "aws_instance" "k3s_master" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  key_name                    = aws_key_pair.key.key_name
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-k3s-master"
    Role = "control-plane"
  }
}

# 🧠 Worker Node 1: AI (Runs Ollama, AI services)
resource "aws_instance" "k3s_worker_ai" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small" # t3.small is allowed on the account
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  key_name                    = aws_key_pair.key.key_name
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 40
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-k3s-worker-ai"
    Role = "worker-ai"
  }
}

# ⚡ Worker Node 2: Backend (Runs custom nodejs microservices)
resource "aws_instance" "k3s_worker_backend" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small" # 2GB RAM for node microservices
  subnet_id                   = aws_subnet.public_2.id
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  key_name                    = aws_key_pair.key.key_name
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-k3s-worker-backend"
    Role = "worker-backend"
  }
}

# 🛠️ Worker Node 3: Support (Runs Redis, Mongo, Ingress)
resource "aws_instance" "k3s_worker_support" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.small" # 2GB RAM
  subnet_id                   = aws_subnet.public_2.id
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  key_name                    = aws_key_pair.key.key_name
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-k3s-worker-support"
    Role = "worker-support"
  }
}
