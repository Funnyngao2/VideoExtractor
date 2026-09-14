#!/bin/bash

# Script tạo backend.tar.gz để upload lên DirectAdmin
# Usage: ./pack-backend.sh

echo "📦 Đang tạo backend.tar.gz..."
echo ""

cd /home/thanhtechhub/Documents/appnoibo/toolstaivideo

tar --exclude='server/node_modules' \
    --exclude='server/downloads' \
    --exclude='server/temp' \
    --exclude='server/logs' \
    --exclude='server/.env' \
    -czf backend.tar.gz \
    server/

if [ $? -eq 0 ]; then
    SIZE=$(du -h backend.tar.gz | cut -f1)
    echo "✅ Tạo thành công: backend.tar.gz ($SIZE)"
    echo ""
    echo "📤 Bước tiếp theo:"
    echo "   1. Mở DirectAdmin File Manager"
    echo "   2. Tạo thư mục: api/"
    echo "   3. Upload file: backend.tar.gz vào api/"
    echo "   4. Extract file trong DirectAdmin"
    echo "   5. SSH vào server:"
    echo "      cd ~/api/server"
    echo "      bash setup-production.sh"
    echo ""
else
    echo "❌ Lỗi khi tạo file"
    exit 1
fi
