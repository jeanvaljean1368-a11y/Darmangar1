// Reset database - delete all data except admin
// Useful when changing pricing rules or for a clean start

import { db } from '../src/lib/db'

async function main() {
  console.log('🔄 در حال پاک‌سازی دیتابیس...\n')

  // Delete in correct order (respecting foreign keys)
  const deleted = {
    chatMessages: await db.chatMessage.deleteMany({}),
    chats: await db.chat.deleteMany({}),
    payments: await db.payment.deleteMany({}),
    proposals: await db.proposal.deleteMany({}),
    receivedRequests: await db.receivedRequest.deleteMany({}),
    serviceRequests: await db.serviceRequest.deleteMany({}),
    documents: await db.providerDocument.deleteMany({}),
    providers: await db.provider.deleteMany({}),
  }

  console.log('✅ داده‌های پاک‌شده:')
  console.log(`   - پیام‌های چت: ${deleted.chatMessages.count}`)
  console.log(`   - چت‌ها: ${deleted.chats.count}`)
  console.log(`   - پرداخت‌ها: ${deleted.payments.count}`)
  console.log(`   - پیشنهادها: ${deleted.proposals.count}`)
  console.log(`   - درخواست‌های دریافتی: ${deleted.receivedRequests.count}`)
  console.log(`   - درخواست‌های خدمت: ${deleted.serviceRequests.count}`)
  console.log(`   - مدارک ارائه‌دهندگان: ${deleted.documents.count}`)
  console.log(`   - ارائه‌دهندگان: ${deleted.providers.count}`)

  // Verify admin still exists
  const adminCount = await db.admin.count()
  console.log(`\n✅ تعداد مدیران باقی‌مانده: ${adminCount}`)

  // Delete uploaded files in /public/uploads/
  const fs = await import('fs')
  const path = await import('path')
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  try {
    const subdirs = await fs.promises.readdir(uploadsDir)
    let fileCount = 0
    for (const subdir of subdirs) {
      const subdirPath = path.join(uploadsDir, subdir)
      const stat = await fs.promises.stat(subdirPath)
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(subdirPath)
        for (const file of files) {
          await fs.promises.unlink(path.join(subdirPath, file))
          fileCount++
        }
        await fs.promises.rmdir(subdirPath)
      } else {
        await fs.promises.unlink(subdirPath)
        fileCount++
      }
    }
    console.log(`\n✅ فایل‌های آپلودی پاک‌شده: ${fileCount}`)
  } catch (e) {
    console.log('\n⚠️  پوشه uploads وجود ندارد یا خطا در پاک‌سازی')
  }

  console.log('\n🎉 دیتابیس با موفقیت ریست شد.')
  console.log('📝 مدیر پیش‌فرض: admin / darmanegar1403')
  console.log('💰 نرخ جدید هزینه پیشنهاد: ۸,۰۰۰ تومان')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
