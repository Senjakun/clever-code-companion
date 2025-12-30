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

echo -e "${YELLOW}[1/5]${NC} Fetching latest changes..."
git fetch origin

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
  echo -e "${GREEN}✅ Already up to date!${NC}"
  exit 0
fi

echo -e "${YELLOW}[2/5]${NC} Pulling latest code..."
git pull origin main

echo -e "${YELLOW}[3/5]${NC} Installing dependencies..."
npm install

echo -e "${YELLOW}[4/5]${NC} Building project..."
npm run build

echo -e "${YELLOW}[5/5]${NC} Deploying to Nginx..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/
systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Update complete!${NC}"
echo -e "${GREEN}📦 New version deployed successfully${NC}"
