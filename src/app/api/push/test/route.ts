// POST /api/push/test — send a test push notification to the current provider
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    // Check if provider has any subscriptions
    const subs = await db.pushSubscription.findMany({
      where: { providerId: provider.id },
    })

    if (subs.length === 0) {
      return bad('شما هیچ subscription ثبت نکرده‌اید. لطفاً ابتدا اعلان‌های Push را فعال کنید.')
    }

    // Try to send a test notification
    const { sendPushToProvider } = await import('@/lib/push')
    const result = await sendPushToProvider(provider.id, {
      title: '🔔 تست اعلان درمانگر',
      body: 'این یک اعلان تستی است. اگر این را می‌بینید، اعلان‌های Push به درستی کار می‌کنند!',
      tag: 'test_notification',
      url: '/',
    })

    if (result.sent > 0) {
      return ok({
        ok: true,
        message: `اعلان تستی ارسال شد! (${result.sent} موفق، ${result.failed} ناموفق)`,
        result,
      })
    } else {
      return bad(`اعلان ارسال نشد. ${result.failed} ناموفق. ممکن است اشتراک منقضی شده باشد.`)
    }
  } catch (e: any) {
    console.error('Test push error:', e)
    return bad(`خطا در ارسال اعلان تستی: ${e.message || 'نامشخص'}`, 500)
  }
}
