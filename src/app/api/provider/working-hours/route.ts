// GET/POST /api/provider/working-hours — get or set working hours
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import { getProviderWorkingHours, setProviderWorkingHours, DAYS_OF_WEEK } from '@/lib/working-hours'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const hours = await getProviderWorkingHours(provider.id)
  return ok({ hours, daysOfWeek: DAYS_OF_WEEK })
}

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const body = await request.json()
    const hours: { dayOfWeek: number; fromHour: number; toHour: number }[] = body.hours

    if (!Array.isArray(hours)) return bad('فرمت ساعات کاری نامعتبر است')

    for (const h of hours) {
      if (h.dayOfWeek < 0 || h.dayOfWeek > 6) return bad('روز هفته نامعتبر است')
      if (h.fromHour < 0 || h.fromHour > 23) return bad('ساعت شروع نامعتبر است')
      if (h.toHour < 1 || h.toHour > 24) return bad('ساعت پایان نامعتبر است')
      if (h.fromHour >= h.toHour) return bad('ساعت شروع باید قبل از ساعت پایان باشد')
    }

    await setProviderWorkingHours(provider.id, hours)
    const updated = await getProviderWorkingHours(provider.id)
    return ok({ ok: true, hours: updated })
  } catch (e: any) {
    return bad('خطا در ذخیره ساعات کاری', 500)
  }
}
