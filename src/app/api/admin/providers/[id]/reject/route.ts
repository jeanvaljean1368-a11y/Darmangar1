// POST /api/admin/providers/[id]/reject — reject a provider
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'
import { notifyDocumentRejected } from '@/lib/notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  const body = await request.json()
  const reason = body.reason?.trim()
  if (!reason) return bad('دلیل رد الزامی است')

  const provider = await db.provider.findUnique({ where: { id } })
  if (!provider) return notFound('ارائه‌دهنده یافت نشد')

  await db.provider.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
    },
  })

  // Send in-app notification to provider
  await notifyDocumentRejected(id, reason).catch(() => {})

  return ok({ ok: true, message: 'ارائه‌دهنده رد شد' })
}
