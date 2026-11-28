// POST /api/push/subscribe — save push subscription for provider
import { NextRequest } from 'next/server'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import { savePushSubscription } from '@/lib/push'

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
    await savePushSubscription(provider.id, { endpoint, keys }, userAgent)

    return ok({ ok: true, message: 'اعلان‌های Push فعال شد' })
  } catch (e: any) {
    return bad('خطا در ثبت اعلان Push', 500)
  }
}
