#!/bin/bash
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=chat-app-k3s-sg" --query "SecurityGroups[*].GroupId" --output text --region ap-southeast-2)
if [ -z "$SG_ID" ]; then
    echo "Could not find SG by name. Finding by IP 3.26.196.59..."
    SG_ID=$(aws ec2 describe-instances --filters 'Name=ip-address,Values=3.26.196.59' --query 'Reservations[*].Instances[*].SecurityGroups[*].GroupId' --output text --region ap-southeast-2)
fi
echo "Security Group ID: $SG_ID"
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 6443 --cidr 0.0.0.0/0 --region ap-southeast-2 || true
echo "Authorized port 6443 for SG $SG_ID"
