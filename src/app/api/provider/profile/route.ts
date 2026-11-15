// GET/PUT /api/provider/profile — get or update own profile
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const body = await request.json()
    const allowedFields = ['bio']
    const data: any = {}
    for (const f of allowedFields) {
      if (typeof body[f] === 'string') {
        if (f === 'bio' && body[f].length > 500) return bad('معرفی نباید بیشتر از ۵۰۰ کاراکتر باشد')
        data[f] = body[f]
      }
    }

    if (Object.keys(data).length === 0) return bad('هیچ فیلدی برای به‌روزرسانی ارسال نشده')

    const updated = await db.provider.update({
      where: { id: provider.id },
      data,
      select: { id: true, bio: true, firstName: true, lastName: true },
    })
    return ok({ ok: true, provider: updated })
  } catch (e: any) {
    return bad('خطا در به‌روزرسانی پروفایل', 500)
  }
}
