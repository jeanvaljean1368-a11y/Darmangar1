#!/bin/bash
# درمانگر - Docker entrypoint
# اجرای همزمان Next.js و WebSocket service

set -e

echo "🚀 درمانگر در حال راه‌اندازی..."

# Apply Prisma schema به دیتابیس (در صورت نیاز)
echo "📋 اعمال Prisma schema..."
bun run db:push --accept-data-loss 2>&1 | tail -5 || true

# در صورت وجود admin ensure
echo "👤 اطمینان از وجود admin..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  try {
    const count = await db.admin.count();
    if (count === 0) {
      const hash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'darmanegar1403', 10);
      await db.admin.create({ data: { username: process.env.DEFAULT_ADMIN_USERNAME || 'admin', password: hash } });
      console.log('✅ Admin created');
    } else {
      console.log('✅ Admin exists');
    }
  } catch (e) {
    console.error('❌ Admin check error:', e.message);
  }
})();
" 2>&1 || true

# شروع WebSocket service در background
echo "🌐 شروع WebSocket service..."
cd /app/mini-services/darmanegar-ws
nohup bun run dev > /tmp/ws.log 2>&1 &
WS_PID=$!
echo "   WS PID: $WS_PID"

# برگشت به مسیر اصلی
cd /app

# صبر برای آماده شدن WS
sleep 2

# شروع Next.js در foreground
echo "✨ شروع Next.js app..."
exec bun /app/.next/standalone/server.js
