#!/bin/bash
# درمانگر - Quick Deploy with Docker
# یک‌کلیک برای استقرار کامل با docker-compose

set -e

echo "🚀 درمانگر - Quick Deploy با Docker"
echo "===================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker نصب نیست."
    echo "   نصب: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose نصب نیست."
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  فایل .env وجود ندارد."
    echo "   در حال کپی از .env.docker.example..."
    cp .env.docker.example .env
    echo "   ✅ فایل .env ایجاد شد"
    echo ""
    echo "⚠️  لطفاً قبل از ادامه، فایل .env را ویرایش کنید و مقادیر واقعی را وارد کنید:"
    echo "   nano .env"
    echo ""
    read -p "آیا فایل .env را ویرایش کردید؟ (y/N): " EDITED
    if [[ "$EDITED" != "y" && "$EDITED" != "Y" ]]; then
        echo "❌ لطفاً ابتدا فایل .env را ویرایش کنید"
        exit 1
    fi
fi

echo ""
echo "1️⃣  Build و start containers..."
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo ""
echo "2️⃣  صبر برای آماده شدن سرویس‌ها..."
sleep 10

echo ""
echo "3️⃣  بررسی وضعیت..."
if docker compose version &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi

echo ""
echo "4️⃣  تست دسترسی..."
if curl -s http://localhost -o /dev/null -w "%{http_code}" | grep -q "200\|301\|302"; then
    echo "   ✅ اپلیکیشن در دسترس است"
else
    echo "   ⚠️  ممکن است هنوز در حال آماده‌شدن باشد. ۳۰ ثانیه صبر کنید و دوباره امتحان کنید."
fi

echo ""
echo "🎉 استقرار کامل شد!"
echo ""
echo "📋 اطلاعات:"
echo "   آدرس اپ:    http://localhost"
echo "   آدرس مستقیم: http://localhost:3000"
echo "   مدیر پیش‌فرض: admin / darmanegar1403"
echo ""
echo "🔧 مدیریت:"
echo "   لاگ‌ها: docker compose logs -f app"
echo "   restart: docker compose restart app"
echo "   stop: docker compose down"
echo "   آپدیت: git pull && docker compose up -d --build"
echo ""
echo "📚 برای تنظیم دامنه و SSL:"
echo "   فایل nginx/conf.d/darmanegar.conf را ویرایش کنید"
echo "   و سپس: docker compose restart nginx"
