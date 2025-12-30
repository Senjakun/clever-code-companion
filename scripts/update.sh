#!/bin/bash

# ===================================
# Auto Update Script (Git Pull & Rebuild)
# Clever Code Companion
# Repository: Senjakun/clever-code-companion
# ===================================

set -e

# Configuration
APP_DIR="/var/www/clever-code-companion"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${BLUE}🔄 Starting auto-update...${NC}"

cd "$APP_DIR"

echo -e "${YELLOW}[1/6]${NC} Fetching latest changes..."
git fetch origin

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
  echo -e "${GREEN}✅ Already up to date!${NC}"
  echo -e "${YELLOW}Forcing rebuild anyway...${NC}"
fi

echo -e "${YELLOW}[2/6]${NC} Pulling latest code..."
git pull origin main || true

echo -e "${YELLOW}[3/6]${NC} Installing dependencies..."
npm install

echo -e "${YELLOW}[4/6]${NC} Building project..."
npm run build

echo -e "${YELLOW}[5/6]${NC} Ensuring Nginx SPA config..."
cat > /etc/nginx/sites-available/default << 'NGINX_CONFIG'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html;

    server_name _;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # SPA fallback - redirect all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINX_CONFIG

echo -e "${YELLOW}[6/6]${NC} Deploying to Nginx..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/
nginx -t && systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Update complete!${NC}"
echo -e "${GREEN}📦 New version deployed successfully${NC}"
