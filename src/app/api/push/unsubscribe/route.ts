// POST /api/push/unsubscribe — remove push subscription
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) return bad('endpoint الزامی است')

    await db.pushSubscription.deleteMany({
      where: { endpoint },
    })

    return ok({ ok: true, message: 'اعلان‌های Push غیرفعال شد' })
  } catch {
    return bad('خطا در حذف اعلان Push', 500)
  }
}
