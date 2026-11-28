// POST /api/push/subscribe — save push subscription for provider
// مستقل از web-push library
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
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return bad('اطلاعات subscription ناقص است')
    }

    const userAgent = request.headers.get('user-agent') || undefined

    // Upsert subscription
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        providerId: provider.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
      update: {
        providerId: provider.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    })

    return ok({ ok: true, message: 'اعلان‌های Push فعال شد' })
  } catch (e: any) {
    console.error('Push subscribe error:', e)
    return bad('خطا در ثبت اعلان Push', 500)
  }
}
