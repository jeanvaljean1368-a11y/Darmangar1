// POST /api/admin/feedback/[id]/status — update feedback status / add admin reply
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json()
    const status = body.status // NEW, REVIEWED, RESOLVED, ARCHIVED
    const adminReply = body.adminReply?.trim() || null

    if (status && !['NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED'].includes(status)) {
      return bad('وضعیت نامعتبر است')
    }

    const existing = await db.systemFeedback.findUnique({ where: { id } })
    if (!existing) return notFound('بازخورد یافت نشد')

    const updated = await db.systemFeedback.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminReply !== undefined ? { adminReply } : {}),
      },
    })

    return ok({
      ok: true,
      feedback: {
        id: updated.id,
        status: updated.status,
        adminReply: updated.adminReply,
      },
    })
  } catch (e: any) {
    return bad('خطا در به‌روزرسانی', 500)
  }
}
