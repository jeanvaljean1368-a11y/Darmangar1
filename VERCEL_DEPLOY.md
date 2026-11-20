# درمانگر — راهنمای انتشار روی Vercel (رایگان)

این راهنما گام‌به‌گام نحوه‌ی انتشار اپلیکیشن درمانگر روی **Vercel** (رایگان) را نشان می‌دهد.

## 📋 آنچه روی Vercel کار می‌کند و آنچه نه

✅ **کار می‌کند:**
- Next.js app (تمام API routes و صفحات)
- Prisma ORM با PostgreSQL
- آپلود فایل‌ها (با Vercel Blob)
- سیستم اعلان درون‌برنامه‌ای
- چت با polling fallback (هر ۵-۱۰ ثانیه)
- تمام فرایندهای اصلی

❌ **کار نمی‌کند:**
- WebSocket service (Vercel از long-running processes پشتیبانی نمی‌کند)
  - راه‌حل: polling fallback فعال است و همه‌چیز را پوشش می‌دهد
- SQLite (فقط فایل سیستم read-only)
  - راه‌حل: استفاده از PostgreSQL رایگان (Neon یا Supabase)

---

## 🚀 مراحل انتشار

### مرحله ۱: ایجاد حساب کاربری (همه رایگان)

۱. **GitHub** — اگر ندارید، در [github.com](https://github.com) ثبت‌نام کنید
۲. **Vercel** — به [vercel.com](https://vercel.com) بروید و با GitHub وارد شوید
۳. **Neon** (دیتابیس PostgreSQL رایگان) — به [neon.tech](https://neon.tech) بروید و ثبت‌نام کنید
۴. **Vercel Blob** (ذخیره‌سازی فایل) — به‌صورت خودکار در Vercel فعال می‌شود

### مرحله ۲: آماده‌سازی دیتابیس PostgreSQL

۱. در [neon.tech](https://neon.tech) یک پروژه‌ی جدید بسازید:
   - Name: `darmanegar`
   - Region: `Singapore` (نزدیک‌ترین به ایران)
   - PostgreSQL version: latest

۲. بعد از ایجاد پروژه، **connection string** را کپی کنید (شبیه این):
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/darmanegar?sslmode=require
   ```

### مرحله ۳: به‌روزرسانی Prisma برای PostgreSQL

در فایل `prisma/schema.prisma`، خط `provider` را تغییر دهید:

```prisma
datasource db {
  provider = "postgresql"  // از "sqlite" به "postgresql" تغییر دهید
  url      = env("DATABASE_URL")
}
```

سپس در ترمینال محلی:
```bash
# تنظیم DATABASE_URL موقت
export DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/darmanegar?sslmode=require"

# اعمال schema روی دیتابیس
bun run db:push --accept-data-loss

# تولید Prisma client
bun run db:generate
```

### مرحله ۴: کد را به GitHub بفرستید

در سیستم محلی:

```bash
cd /home/z/my-project

# اگر هنوز git init نکرده‌اید
git init -b main
git add .
git commit -m "درمانگر - ready for Vercel"

# ایجاد مخزن در GitHub و push
git remote add origin https://github.com/YOUR_USERNAME/darmanegar.git
git branch -M main
git push -u origin main
```

### مرحله ۵: استقرار روی Vercel

۱. به [vercel.com/dashboard](https://vercel.com/dashboard) بروید
۲. روی **«Add New...»** → **«Project»** کلیک کنید
۳. مخزن `darmanegar` را از لیست GitHub انتخاب کنید
۴. تنظیمات را به‌صورت پیش‌فرض بگذارید (Vercel به‌صورت خودکار Next.js را تشخیص می‌دهد)
۵. در بخش **«Environment Variables»** این متغیرها را اضافه کنید:

| نام | مقدار | توضیح |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://...` | connection string از Neon |
| `JWT_SECRET` | یک رشته‌ی تصادفی ۳۲+ کاراکتر | تولید: `openssl rand -base64 64` |
| `PAYMENT_PROVIDER` | `mock` | فعلاً mock، بعداً `zarinpal` |
| `PAYMENT_CALLBACK_URL` | `https://your-app.vercel.app/api/payment/callback` | بعد از deploy اول، آدرس واقعی را وارد کنید |
| `BLOB_READ_WRITE_TOKEN` | (خودکار در Vercel) | برای آپلود فایل |
| `DEFAULT_ADMIN_USERNAME` | `admin` | نام کاربری مدیر |
| `DEFAULT_ADMIN_PASSWORD` | `darmanegar1403` | حتماً بعداً تغییر دهید! |

۶. روی **«Deploy»** کلیک کنید

۷. حدود ۲-۳ دقیقه صبر کنید تا build کامل شود

۸. آدرس `https://darmanegar-xxx.vercel.app` فعال خواهد شد!

### مرحله ۶: تنظیمات پس از انتشار

۱. **اعمال schema روی دیتابیس production:**
   ```bash
   # روی سیستم محلی با DATABASE_URL تولید شده در Vercel:
   export DATABASE_URL="postgresql://...neon.tech/darmanegar?sslmode=require"
   bun run db:push --accept-data-loss
   ```

۲. **به‌روزرسانی `PAYMENT_CALLBACK_URL`** در Vercel با آدرس واقعی

۳. **اولین ورود به پنل مدیر:**
   - به آدرس اپ بروید
   - روی «ورود مدیریت» کلیک کنید
   - با `admin` / `darmanegar1403` وارد شوید
   - **فوراً رمز را تغییر دهید** (برای تغییر: از طریق دیتابیس یا API)

---

## 🎯 تست پس از انتشار

۱. اپ را باز کنید: `https://your-app.vercel.app`
۲. روی «ورود درخواست‌کننده» کلیک کنید — باید ببینید ۵ نوع خدمت
۳. یک درخواست آزمایشی ثبت کنید
۴. در یک تب دیگر، به‌عنوان ارائه‌دهنده ثبت‌نام کنید
۵. در پنل ادمین، ارائه‌دهنده را تأیید کنید
۶. درخواست‌های فعال را در داشبورد ارائه‌دهنده ببینید

---

## 🔧 محدودیت‌های پلن رایگان Vercel

| منبع | محدودیت |
|------|---------|
| Bandwidth | 100GB/ماه |
| Build executions | 6000 دقیقه/ماه |
| Function invocations | نامحدود |
| Function duration | 10 ثانیه (Hobby) |
| Cron jobs | نیاز به پلن Pro |

### اگر محدودیت‌ها پر شد:
- پلن Pro: $20/ماه — bandwidth نامحدود، function duration تا 60 ثانیه
- یا مهاجرت به VPS ایرانی (با Docker)

---

## 🆘 رفع اشکال

### مشکل: صفحه سفید یا خطای 500

```bash
# بررسی لاگ‌ها در Vercel dashboard:
# Project → Logs → Realtime Logs
```

### مشکل: دیتابیس متصل نمی‌شود

- مطمئن شوید `DATABASE_URL` درست است و `?sslmode=require` در انتها هست
- در Neon، IP از هر مکان allowed است (default)

### مشکل: آپلود فایل کار نمی‌کند

- مطمئن شوید `BLOB_READ_WRITE_TOKEN` در Vercel تنظیم شده
- در Vercel dashboard: Storage → Create Blob Store → Connect to project

### مشکل: اعلان‌ها نمایش داده نمی‌شوند

- اعلان‌ها به‌صورت polling هر ۱۰ ثانیه چک می‌شوند
- اگر آفلاین بودید و آنلاین شدید، اعلان‌های قدیمی نمایش داده می‌شوند

### مشکل: چت کار نمی‌کند

- در Vercel، WebSocket کار نمی‌کند
- polling fallback هر ۵ ثانیه پیام‌های جدید را چک می‌کند
- ممکن است ۵-۱۰ ثانیه تأخیر داشته باشد

---

## 📞 پشتیبانی

اگر با مشکلی مواجه شدید:
۱. لاگ‌های Vercel را بررسی کنید
۲. مطمئن شوید همه‌ی env vars درست تنظیم شده‌اند
۳. در dashboard Neon، وضعیت دیتابیس را چک کنید

**موفق باشید! 🎉**
