# راهنمای انتشار درمانگر

این سند راهنمای کامل برای انتشار اپلیکیشن درمانگر در محیط production است.

## 📋 پیش‌نیازها

### روی سرور (VPS لینوکسی)

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Nginx
sudo apt-get install -y nginx

# PostgreSQL (پیشنهاد) یا استفاده از SQLite
sudo apt-get install -y postgresql postgresql-contrib

# Git (برای clone کد)
sudo apt-get install -y git

# Certbot (برای SSL رایگان)
sudo apt-get install -y certbot python3-certbot-nginx

# PM2 (مدیریت process — اختیاری، جایگزین systemd)
# sudo npm install -g pm2
```

### حداقل منابع سرور
- **RAM:** 1GB (توصیه: 2GB)
- **CPU:** 1 core (توصیه: 2 cores)
- **Disk:** 10GB (برای کد + دیتابیس + آپلودها)
- **OS:** Ubuntu 22.04+ یا Debian 12+

---

## 🚀 مراحل انتشار

### مرحله ۱: آماده‌سازی کد

کد رو از مخزن Git روی سرور clone کنید یا با rsync آپلود کنید:

```bash
# روش ۱: Git
cd /var/www
git clone https://your-repo-url.git darmanegar
cd darmanegar

# روش ۲: rsync (از سیستم محلی)
rsync -av --exclude='node_modules' --exclude='.next' --exclude='db/*.db' \
  ./ user@your-server:/var/www/darmanegar/
```

### مرحله ۲: پیکربندی Environment

فایل `.env.production.example` رو به `.env` کپی کنید و مقادیر واقعی رو پر کنید:

```bash
cp .env.production.example .env
nano .env
```

**متغیرهای حیاتی که باید تنظیم شوند:**

| متغیر | توضیح | مثال |
|-------|-------|------|
| `DATABASE_URL` | اتصال به دیتابیس | `postgresql://user:pass@localhost:5432/darmanegar` |
| `JWT_SECRET` | رشته‌ی تصادفی ۳۲+ کاراکتر | `openssl rand -base64 64` |
| `SMS_PROVIDER` | نوع درگاه SMS | `kavenegar` یا `farazsms` |
| `KAVENEGAR_API_KEY` | کلید API کاوه‌نگار | از پنل کاوه‌نگار |
| `PAYMENT_PROVIDER` | نوع درگاه پرداخت | `zarinpal` یا `idpay` |
| `ZARINPAL_MERCHANT_ID` | مرچنت کد زرین‌پال | از پنل زرین‌پال |
| `PAYMENT_CALLBACK_URL` | آدرس کال‌بک | `https://darmanegar.ir/api/payment/callback` |

### مرحله ۳: نصب وابستگی‌ها و Build

```bash
cd /var/www/darmanegar

# نصب وابستگی‌ها
bun install

# Build production
NODE_ENV=production bun run build

# تولید Prisma Client
bun run db:generate

# اعمال schema روی دیتابیس
bun run db:push --accept-data-loss  # فقط اولین بار
# یا برای migration:
# bun run db:migrate
```

### مرحله ۴: راه‌اندازی سرویس‌ها

#### روش ۱: استفاده از systemd (توصیه)

فایل `/etc/systemd/system/darmanegar.service` رو بسازید:

```ini
[Unit]
Description=درمانگر - Next.js Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/darmanegar
EnvironmentFile=/var/www/darmanegar/.env
ExecStart=/usr/bin/bun /var/www/darmanegar/.next/standalone/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

فایل `/etc/systemd/system/darmanegar-ws.service` رو بسازید:

```ini
[Unit]
Description=درمانگر - WebSocket Service
After=network.target darmanegar.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/darmanegar/mini-services/darmanegar-ws
ExecStart=/usr/bin/bun run dev
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

فعال‌سازی و شروع:

```bash
sudo systemctl daemon-reload
sudo systemctl enable darmanegar darmanegar-ws
sudo systemctl start darmanegar darmanegar-ws

# بررسی وضعیت
sudo systemctl status darmanegar
sudo systemctl status darmanegar-ws
```

#### روش ۲: استفاده از deploy.sh (خودکار)

اسکریپت آماده در `scripts/deploy.sh`:

```bash
sudo ./scripts/deploy.sh
```

این اسکریپت به‌صورت خودکار:
- وابستگی‌ها رو نصب می‌کنه
- Build می‌گیره
- سرویس‌های systemd رو پیکربندی می‌کنه
- Nginx رو با دامنه‌ی شما تنظیم می‌کنه
- SSL (اختیاری) رو نصب می‌کنه

### مرحله ۵: پیکربندی Nginx

فایل `/etc/nginx/sites-available/darmanegar`:

```nginx
server {
    listen 80;
    server_name darmanegar.ir www.darmanegar.ir;

    # Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static/ {
        alias /var/www/darmanegar/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /var/www/darmanegar/public/uploads/;
        expires 30d;
    }

    # Service worker (no cache)
    location /sw.js {
        alias /var/www/darmanegar/public/sw.js;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest
    location /manifest.json {
        alias /var/www/darmanegar/public/manifest.json;
        add_header Content-Type "application/manifest+json";
    }

    # Upload limit (10MB for documents)
    client_max_body_size 10M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;
}
```

فعال‌سازی:

```bash
sudo ln -sf /etc/nginx/sites-available/darmanegar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### مرحله ۶: نصب SSL (HTTPS)

```bash
sudo certbot --nginx -d darmanegar.ir -d www.darmanegar.ir \
  --non-interactive --agree-tos -m admin@darmanegar.ir
```

Certbot به‌صورت خودکار:
- SSL certificate رایگان از Let's Encrypt می‌گیره
- Nginx رو برای HTTPS پیکربندی می‌کنه
- Renewal خودکار رو تنظیم می‌کنه

### مرحله ۷: تست نهایی

```bash
# تست دسترسی
curl -I https://darmanegar.ir

# تست لاگ
sudo journalctl -u darmanegar -f
sudo journalctl -u darmanegar-ws -f

# تست WebSocket
curl -I https://darmanegar.ir/?XTransformPort=3003
```

---

## 🔄 آپدیت اپلیکیشن

برای آپدیت به نسخه‌ی جدید:

```bash
cd /var/www/darmanegar

# pull کد جدید
git pull origin main

# یا rsync از سیستم محلی

# نصب وابستگی‌های جدید (اگر تغییر کرده)
bun install

# Build جدید
NODE_ENV=production bun run build

# اعمال schema جدید (اگر تغییر کرده)
bun run db:push --accept-data-loss
# یا برای migration:
# bun run db:migrate

# restart سرویس‌ها
sudo systemctl restart darmanegar darmanegar-ws
```

---

## 📊 پشتیبان‌گیری

### بکاپ خودکار دیتابیس (cron)

اسکریپت `/var/www/darmanegar/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/darmanegar"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U darmanegar darmanegar > $BACKUP_DIR/db_$DATE.sql

# SQLite backup (اگر از SQLite استفاده می‌کنید)
# cp /var/www/darmanegar/db/custom.db $BACKUP_DIR/db_$DATE.db

# نگهداری فقط ۷ روز
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

Cron job:

```bash
# اجرای روزانه ساعت ۳ بامداد
echo "0 3 * * * /var/www/darmanegar/scripts/backup.sh" | sudo crontab -
```

### بکاپ آپلودها

```bash
# در همان اسکریپت:
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/darmanegar/public/uploads/
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

---

## 🔧 مهاجرت از SQLite به PostgreSQL

اگر در توسعه از SQLite استفاده کردید و می‌خواهید به PostgreSQL منتقل کنید:

### ۱. نصب PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql
```

### ۲. ایجاد دیتابیس و کاربر

```sql
CREATE USER darmanegar WITH PASSWORD 'your-strong-password';
CREATE DATABASE darmanegar OWNER darmanegar;
GRANT ALL PRIVILEGES ON DATABASE darmanegar TO darmanegar;
\q
```

### ۳. تغییر schema

در `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // تغییر از sqlite به postgresql
  url      = env("DATABASE_URL")
}
```

### ۴. به‌روزرسانی .env

```env
DATABASE_URL="postgresql://darmanegar:your-strong-password@localhost:5432/darmanegar?schema=public"
```

### ۵. اعمال schema

```bash
bun run db:push --accept-data-loss
```

### ۶. انتقال داده‌های موجود (اختیاری)

اگر داده‌های تستی دارید و می‌خواهید منتقل کنید، از ابزارهایی مثل `pgloader` استفاده کنید.

---

## 🇮🇷 ملاحظات خاص برای ایران

### انتخاب هاست

**پیشنهادی:**
1. **فراسرور** (faraserver.com) — VPS اقتصادی، پشتیبانی فارسی
2. **پارس‌پک** (parspack.com) — هاست و VPS با پشتیبانی ۲۴/۷
3. **ایران‌سرور** (iranserver.com) — VPS با IP ایرانی
4. **ابرآروان** (arvancloud.com) — ابر ایرانی با CDN

### ثبت دامنه

- دامنه‌های `.ir` از پژوهشگاه دانش‌های بنیادی (nic.ir)
- دامنه‌های `.com` از reseller‌های ایرانی یا Namecheap

### درگاه پرداخت ایرانی

**پیشنهادی:**
1. **زرین‌پال** (zarinpal.com) — درگاه چندبانکی، تسویه سریع
2. **آیدی‌پی** (idpay.ir) — کارمزد پایین
3. **پی‌پینگ** (payping.ir) — API ساده
4. **سامان** (sep.ir) — درگاه بانک سامان

### درگاه SMS ایرانی

**پیشنهادی:**
1. **کاوه‌نگار** (kavenegar.com) — API قدرتمند، پنل کاربری خوب
2. **فراز SMS** (farazsms.com) — اقتصادی
3. **ملی پیامک** (melipayamak.ir) — قدیمی و پایدار
4. **اس‌ام‌اس‌.ir** (sms.ir) — امکانات متنوع

---

## ⚠️ نکات امنیتی مهم

1. **رمز admin را فوراً تغییر دهید** پس از اولین ورود
2. **JWT_SECRET** یک رشته‌ی تصادفی طولانی باشد (حداقل ۳۲ کاراکتر)
3. **HTTPS** را حتماً فعال کنید (SSL رایگان Let's Encrypt)
4. **فایروال** را فعال کنید (فقط پورت‌های 80، 443 و SSH باز)
5. **پشتیبان‌گیری خودکار** دیتابیس را تنظیم کنید
6. **آپدیت‌های امنیتی** سرور را به‌موقع اعمال کنید
7. **دسترسی SSH** را محدود کنید (کلید عمومی به‌جای رمز)
8. **fail2ban** را برای جلوگیری از brute force نصب کنید

```bash
# نصب fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📈 پایش و لاگ‌ها

### مشاهده‌ی لاگ‌ها

```bash
# لاگ‌های اپلیکیشن
sudo journalctl -u darmanegar -f
sudo journalctl -u darmanegar-ws -f

# لاگ‌های Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### پایش منابع

```bash
# نصب htop
sudo apt-get install -y htop
htop

# وضعیت دیسک
df -h

# وضعیت RAM
free -h
```

### آلرت با SMS

می‌توانید اسکریپتی بنویسید که در صورت قطع سرویس، SMS به شما ارسال کند:

```bash
#!/bin/bash
if ! systemctl is-active --quiet darmanegar; then
  # ارسال SMS از طریق API درمانگر
  curl -X POST https://darmanegar.ir/api/admin/sms-alert \
    -H "Content-Type: application/json" \
    -d '{"message": "سرویس درمانگر قطع شده است!"}'
fi
```

---

## 🆘 رفع اشکال

### مشکل: اپلیکیشن اجرا نمی‌شود

```bash
# بررسی لاگ
sudo journalctl -u darmanegar -n 50

# بررسی فایل .env
cat /var/www/darmanegar/.env | grep -v PASSWORD

# تست دستی
cd /var/www/darmanegar
sudo -u www-data bun run start
```

### مشکل: WebSocket کار نمی‌کند

```bash
# بررسی سرویس WS
sudo systemctl status darmanegar-ws
sudo journalctl -u darmanegar-ws -n 50

# تست اتصال
curl -I http://localhost:3003
```

### مشکل: Nginx خطا می‌دهد

```bash
# بررسی config
sudo nginx -t

# بررسی لاگ
sudo tail -f /var/log/nginx/error.log
```

### مشکل: دیتابیس متصل نمی‌شود

```bash
# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"

# تست اتصال
psql -U darmanegar -d darmanegar -h localhost
```

---

## 📞 پشتیبانی

اگر با مشکلی مواجه شدید:
1. لاگ‌های مربوطه را بررسی کنید
2. مستندات Prisma، Next.js و Nginx را مطالعه کنید
3. در صورت نیاز با تیم فنی تماس بگیرید

---

**موفق باشید! 🎉**
