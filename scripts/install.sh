#!/bin/bash

# ===================================
# Auto Install & Deploy Script
# Clever Code Companion
# ===================================

set -e

echo "🚀 Starting auto installation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${YELLOW}[1/6]${NC} Updating system..."
apt update && apt upgrade -y

echo -e "${YELLOW}[2/6]${NC} Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${YELLOW}[3/6]${NC} Installing Nginx..."
apt install -y nginx

echo -e "${YELLOW}[4/6]${NC} Installing dependencies..."
npm install

echo -e "${YELLOW}[5/6]${NC} Building project..."
npm run build

echo -e "${YELLOW}[6/6]${NC} Deploying to Nginx..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/
systemctl restart nginx

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo -e "${GREEN}🌐 Your app is live at: http://${SERVER_IP}${NC}"
echo ""
echo -e "${YELLOW}Optional next steps:${NC}"
echo "  - Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo "  - Setup firewall: sudo ufw allow 'Nginx Full'"
