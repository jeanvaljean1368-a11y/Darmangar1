#!/bin/bash
# درمانگر - Production Deployment Script
# این اسکریپت روی سرور لینوکسی اجرا می‌شود
#前提: Node.js 20+, Bun, PostgreSQL (یا SQLite), Nginx

set -e

# Configuration
APP_NAME="darmanegar"
APP_DIR="/var/www/darmanegar"
APP_USER="www-data"
NODE_VERSION="20"

echo "🚀 شروع استقرار درمانگر..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ این اسکریپت باید با sudo اجرا شود"
  exit 1
fi

# Check dependencies
echo "1. بررسی پیش‌نیازها..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js نصب نیست. اول نصب کنید: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "❌ Bun نصب نیست. نصب: curl -fsSL https://bun.sh/install | bash"; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "❌ Nginx نصب نیست. نصب: sudo apt-get install -y nginx"; exit 1; }
echo "   ✓ همه‌ی پیش‌نیازها موجودند"

# Create app directory
echo ""
echo "2. ایجاد پوشه‌ی اپلیکیشن..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR
echo "   ✓ پوشه‌ی $APP_DIR ایجاد شد"

# Copy source code (assume current directory contains the code)
echo ""
echo "3. کپی کد منبع..."
if [ "$(pwd)" != "$APP_DIR" ]; then
  rsync -av --exclude='node_modules' --exclude='.next' --exclude='db/*.db' ./ $APP_DIR/
fi
cd $APP_DIR
echo "   ✓ کد منبع کپی شد"

# Install dependencies
echo ""
echo "4. نصب وابستگی‌ها..."
sudo -u $APP_USER bun install --production
echo "   ✓ وابستگی‌ها نصب شدند"

# Build Next.js
echo ""
echo "5. Build اپلیکیشن..."
sudo -u $APP_USER NODE_ENV=production bun run build
echo "   ✓ Build انجام شد"

# Generate Prisma client
echo ""
echo "6. تولید Prisma Client..."
sudo -u $APP_USER bun run db:generate
echo "   ✓ Prisma Client تولید شد"

# Push database schema (use --accept-data-loss only on first deployment)
echo ""
echo "7. اعمال schema روی دیتابیس..."
read -p "آیا اولین استقرار است؟ (y/N): " FIRST_DEPLOY
if [[ "$FIRST_DEPLOY" == "y" || "$FIRST_DEPLOY" == "Y" ]]; then
  sudo -u $APP_USER bun run db:push --accept-data-loss
  echo "   ✓ Schema اعمال شد (اولین استقرار)"
else
  echo "   ⚠️  برای migration از bun run db:migrate استفاده کنید"
fi

# Setup systemd services
echo ""
echo "8. راه‌اندازی systemd services..."

# Next.js service
cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=درمانگر - Next.js Application
After=network.target postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/bun $APP_DIR/.next/standalone/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# WebSocket service
cat > /etc/systemd/system/${APP_NAME}-ws.service << EOF
[Unit]
Description=درمانگر - WebSocket Service
After=network.target ${APP_NAME}.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/mini-services/darmanegar-ws
ExecStart=/usr/bin/bun run dev
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable ${APP_NAME} ${APP_NAME}-ws
systemctl restart ${APP_NAME} ${APP_NAME}-ws
echo "   ✓ سرویس‌ها فعال شدند"

# Setup Nginx
echo ""
echo "9. پیکربندی Nginx..."
read -p "دامنه‌ی سایت را وارد کنید (مثلاً darmanegar.ir): " DOMAIN

cat > /etc/nginx/sites-available/${APP_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Redirect HTTP to HTTPS (فعال بعد از نصب SSL)
    # return 301 https://\$host\$request_uri;

    # Next.js main app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket (port 3003 via path with XTransformPort query)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Static files
    location /_next/static/ {
        alias $APP_DIR/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Uploaded files
    location /uploads/ {
        alias $APP_DIR/public/uploads/;
        expires 30d;
    }

    # Service worker (no cache)
    location /sw.js {
        alias $APP_DIR/public/sw.js;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest
    location /manifest.json {
        alias $APP_DIR/public/manifest.json;
        add_header Content-Type "application/manifest+json";
    }

    # File upload limit (for documents)
    client_max_body_size 10M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;
}

# HTTPS server (فعال بعد از نصب SSL با certbot)
# server {
#     listen 443 ssl http2;
#     server_name ${DOMAIN} www.${DOMAIN};
#     ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
#     # ... (همان تنظیمات بالا)
# }
EOF

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "   ✓ Nginx پیکربندی شد برای دامنه: $DOMAIN"

# Setup SSL with Let's Encrypt (optional)
echo ""
read -p "آیا می‌خواهید SSL نصب شود؟ (y/N): " SETUP_SSL
if [[ "$SETUP_SSL" == "y" || "$SETUP_SSL" == "Y" ]]; then
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
  echo "   ✓ SSL نصب شد"
fi

# Firewall
echo ""
echo "10. پیکربندی فایروال..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow ssh
  echo "y" | ufw enable
  echo "   ✓ فایروال فعال شد (پورت‌های 80 و 443 باز)"
fi

# Final checks
echo ""
echo "11. بررسی نهایی..."
sleep 3
if systemctl is-active --quiet ${APP_NAME}; then
  echo "   ✓ سرویس درمانگر در حال اجراست"
else
  echo "   ❌ سرویس درمانگر اجرا نمی‌شود — بررسی کنید: systemctl status ${APP_NAME}"
fi
if systemctl is-active --quiet ${APP_NAME}-ws; then
  echo "   ✓ سرویس WebSocket در حال اجراست"
else
  echo "   ❌ سرویس WebSocket اجرا نمی‌شود"
fi

echo ""
echo "🎉 استقرار کامل شد!"
echo ""
echo "📋 مراحل بعدی:"
echo "   1. فایل .env را در $APP_DIR/.env ویرایش کنید و مقادیر واقعی را وارد کنید"
echo "   2. مقادیر REAL را برای SMS_PROVIDER، PAYMENT_PROVIDER تنظیم کنید"
echo "   3. رمز admin را پس از اولین ورود تغییر دهید"
echo "   4. پشتیبان‌گیری خودکار دیتابیس را تنظیم کنید"
echo ""
echo "🔗 آدرس‌ها:"
echo "   سایت: http://$DOMAIN"
echo "   پنل مدیر: http://$DOMAIN (با کلیک روی «ورود مدیریت»)"
echo ""
echo "📊 مدیریت:"
echo "   مشاهده لاگ: journalctl -u ${APP_NAME} -f"
echo "   restart: systemctl restart ${APP_NAME} ${APP_NAME}-ws"
echo "   status: systemctl status ${APP_NAME} ${APP_NAME}-ws"
