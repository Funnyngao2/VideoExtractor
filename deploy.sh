#!/bin/bash

# VideoExtractor - Deployment Script for DirectAdmin
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 VideoExtractor - Production Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Frontend
echo -e "${YELLOW}[1/4] Building React frontend...${NC}"
cd client
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 2: Create deployment packages
echo -e "${YELLOW}[2/4] Creating deployment packages...${NC}"

# Frontend package
echo "Packaging frontend..."
cd client/dist
tar -czf ../../frontend.tar.gz *
cd ../..
echo -e "${GREEN}✓ frontend.tar.gz created ($(du -h frontend.tar.gz | cut -f1))${NC}"

# Backend package (exclude node_modules, downloads, temp, logs)
echo "Packaging backend..."
tar -czf backend.tar.gz \
    server/ \
    --exclude='server/node_modules' \
    --exclude='server/downloads' \
    --exclude='server/temp' \
    --exclude='server/logs' \
    --exclude='server/.env'
echo -e "${GREEN}✓ backend.tar.gz created ($(du -h backend.tar.gz | cut -f1))${NC}"

# Copy .htaccess template
cp public_html.htaccess.template htaccess.txt
echo -e "${GREEN}✓ htaccess.txt created${NC}"
echo ""

# Step 3: Create deployment info
echo -e "${YELLOW}[3/4] Creating deployment info...${NC}"
cat > DEPLOY_FILES.txt << EOF
📦 Deployment Packages Ready
============================

Created: $(date '+%Y-%m-%d %H:%M:%S')

Files to upload:
├── frontend.tar.gz ($(du -h frontend.tar.gz | cut -f1)) → Upload to public_html/
├── backend.tar.gz ($(du -h backend.tar.gz | cut -f1)) → Upload to api/
└── htaccess.txt → Rename to .htaccess in public_html/

Next steps:
1. Upload files via DirectAdmin File Manager
2. Extract archives in their respective directories
3. SSH to server and run:
   cd ~/api/server
   npm install --production
   pm2 start ecosystem.config.js
   pm2 save

4. Test:
   curl https://astrothanh.adobi.shop/api/health
   Open: https://astrothanh.adobi.shop

Full guide: See DEPLOY_CHECKLIST.md
EOF

echo -e "${GREEN}✓ DEPLOY_FILES.txt created${NC}"
echo ""

# Step 4: Summary
echo -e "${YELLOW}[4/4] Deployment Summary${NC}"
echo "=============================="
echo ""
ls -lh frontend.tar.gz backend.tar.gz htaccess.txt
echo ""
echo -e "${GREEN}✅ Deployment packages ready!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Upload these 3 files to DirectAdmin:"
echo "      • frontend.tar.gz → public_html/"
echo "      • backend.tar.gz → api/"
echo "      • htaccess.txt → public_html/.htaccess"
echo ""
echo "   2. Extract archives on server"
echo ""
echo "   3. SSH setup:"
echo "      cd ~/api/server"
echo "      npm install --production"
echo "      pm2 start ecosystem.config.js"
echo ""
echo "   4. Test: https://astrothanh.adobi.shop"
echo ""
echo "📖 Full guide: DEPLOY_CHECKLIST.md"
echo ""
