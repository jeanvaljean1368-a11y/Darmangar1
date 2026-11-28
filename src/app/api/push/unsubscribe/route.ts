// POST /api/push/unsubscribe — remove push subscription
import { NextRequest } from 'next/server'
import { ok, bad } from '@/lib/http'
import { removePushSubscription } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) return bad('endpoint الزامی است')

    await removePushSubscription(endpoint)
    return ok({ ok: true, message: 'اعلان‌های Push غیرفعال شد' })
  } catch {
    return bad('خطا در حذف اعلان Push', 500)
  }
}
