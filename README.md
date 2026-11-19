# درمانگر — راهنمای انتشار سریع

اپلیکیشن پلتفرم خدمات سلامت ایران

## 🚀 انتشار سریع (Vercel — رایگان)

### روش ۱: انتشار روی Vercel (سریع‌ترین، رایگان)

۱. کد را در GitHub قرار دهید:
```bash
git init
git add .
git commit -m "درمانگر - production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/darmanegar.git
git push -u origin main
```

۲. به [vercel.com](https://vercel.com) بروید و با GitHub وارد شوید

۳. روی «New Project» کلیک کنید و مخزن درمانگر را انتخاب کنید

۴. تنظیمات پیش‌فرض را بپذیرید (Vercel به‌صورت خودکار Next.js را تشخیص می‌دهد)

۵. متغیرهای محیطی زیر را در بخش Settings → Environment Variables اضافه کنید:
   - `DATABASE_URL` — `file:./db/custom.db` (یا PostgreSQL URL)
   - `JWT_SECRET` — یک رشته‌ی تصادفی طولانی
   - `SMS_PROVIDER` — `mock` (یا kavenegar)
   - `PAYMENT_PROVIDER` — `mock` (یا zarinpal)

۶. روی Deploy کلیک کنید — Vercel به‌صورت خودکار build می‌گیرد و منتشر می‌کند

۷. پس از انتشار، آدرس `https://darmanegar.vercel.app` فعال خواهد شد

### روش ۲: انتشار روی VPS ایرانی (پیشنهاد برای production)

#### پیش‌نیازها
- یک VPS لینوکسی (Ubuntu 22.04+)
- یک دامنه (مثلاً darmanegar.ir)
- درگاه پرداخت ایرانی (زرین‌پال)
- (اختیاری) پنل SMS (کاوه‌نگار) — در حال حاضر نوتیفیکیشن درون‌برنامه‌ای استفاده می‌شود

#### مراحل

```bash
# روی سرور:
git clone https://github.com/YOUR_USERNAME/darmanegar.git /var/www/darmanegar
cd /var/www/darmanegar

# پیکربندی environment
cp .env.production.example .env
nano .env  # مقادیر واقعی را وارد کنید

# اجرای اسکریپت استقرار
sudo ./scripts/deploy.sh
```

اسکریپت به‌صورت خودکار:
- وابستگی‌ها را نصب می‌کند
- Build می‌گیرد
- سرویس‌های systemd را راه‌اندازی می‌کند
- Nginx را پیکربندی می‌کند
- SSL رایگان Let's Encrypt را نصب می‌کند (اختیاری)

## 📋 چک‌لیست قبل از انتشار

### 필ادی تنظیمات:
- [ ] `JWT_SECRET` به یک رشته‌ی تصادفی ۳۲+ کاراکتر تغییر کند
- [ ] رمز پیش‌فرض admin پس از اولین ورود تغییر کند (`admin` / `darmanegar1403`)
- [ ] `DATABASE_URL` به PostgreSQL production تغییر کند (برای scale بالا)
- [ ] `PAYMENT_CALLBACK_URL` به آدرس واقعی دامنه تنظیم شود

### اختیاری (برای محیط واقعی):
- [ ] `PAYMENT_PROVIDER=zarinpal` و `ZARINPAL_MERCHANT_ID` تنظیم شود
- [ ] `SMS_PROVIDER=kavenegar` و `KAVENEGAR_API_KEY` (در صورت نیاز به SMS)
- [ ] پشتیبان‌گیری خودکار دیتابیس فعال شود
- [ ] SSL فعال شود

## 🎯 ویژگی‌های سیستم

### سیستم اعلان درون‌برنامه‌ای (جایگزین SMS)
- هنگام ثبت درخواست جدید، اعلان به‌صورت خودکار به ارائه‌دهندگان منطبق ارسال می‌شود
- زنگوله با شمارنده در داشبورد ارائه‌دهنده
- پنل اعلان‌ها با امکان «علامت‌گذاری به‌عنوان خوانده‌شده»
- نیازی به سیم‌کارت یا درگاه SMS ندارد
- پایش کامل در پنل ادمین (تب «اعلان‌ها»)

### فرایند کار
1. **درخواست‌کننده** (بدون ثبت‌نام): انتخاب خدمت → استان → شهر → محله → فرم → دریافت ۵ پیشنهاد → انتخاب → چت
2. **ارائه‌دهنده** (با ثبت‌نام و تأیید مدارک): دریافت اعلان‌ها → ثبت پیشنهاد → چت → تکمیل خدمت → دریافت امتیاز
3. **مدیر**: تأیید/رد ارائه‌دهندگان، مشاهده‌ی درخواست‌ها، آمار، درآمد، اعلان‌ها

### سیستم مالی
- ۵ پیشنهاد اول رایگان برای هر ارائه‌دهنده
- از پیشنهاد ششم: ۸,۰۰۰ تومان به صندوق سیستم
- کد معرف: ۲ پیشنهاد رایگان اضافه
- کیف پول با قابلیت شارژ از درگاه پرداخت

## 🔧 مدیریت پس از انتشار

```bash
# مشاهده‌ی وضعیت سرویس‌ها
sudo systemctl status darmanegar darmanegar-ws

# مشاهده‌ی لاگ‌ها
sudo journalctl -u darmanegar -f
sudo journalctl -u darmanegar-ws -f

# restart سرویس‌ها
sudo systemctl restart darmanegar darmanegar-ws

# آپدیت به نسخه‌ی جدید
cd /var/www/darmanegar
git pull
bun install
NODE_ENV=production bun run build
sudo systemctl restart darmanegar darmanegar-ws
```

## 🆘 رفع اشکال

اگر صفحه سفید است:
```bash
sudo journalctl -u darmanegar -n 50
```

اگر اعلان‌ها نمایش داده نمی‌شوند:
- اطمینان حاصل کنید که ارائه‌دهنده وارد شده است
- بررسی کنید: `curl -H "Cookie: provider-token=..." http://localhost:3000/api/provider/notifications`

اگر درگاه پرداخت کار نمی‌کند:
- در حالت `mock` پرداخت خودکار تأیید می‌شود
- برای زرین‌پال واقعی: مرچنت کد را تنظیم کنید

## 📞 اطلاعات تماس

در صورت بروز مشکل، لاگ‌های سیستم را بررسی کنید.

**موفق باشید! 🎉**
