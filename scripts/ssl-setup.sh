#!/bin/bash

# ===================================
# Auto SSL Setup Script (Let's Encrypt)
# Clever Code Companion
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
  echo -e "${RED}Usage: sudo bash scripts/ssl-setup.sh yourdomain.com${NC}"
  echo -e "${YELLOW}Example: sudo bash scripts/ssl-setup.sh myapp.com${NC}"
  exit 1
fi

DOMAIN=$1

echo "🔒 Setting up SSL for: $DOMAIN"

echo -e "${YELLOW}[1/3]${NC} Installing Certbot..."
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}[2/3]${NC} Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo -e "${YELLOW}[3/3]${NC} Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo -e "${GREEN}✅ SSL setup complete!${NC}"
echo -e "${GREEN}🔒 Your app is now live at: https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}SSL will auto-renew every 90 days${NC}"
echo -e "${YELLOW}Test renewal: sudo certbot renew --dry-run${NC}"
