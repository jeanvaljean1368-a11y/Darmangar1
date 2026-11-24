// GET /api/admin/feedback — list all system feedback
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)

  const feedback = await db.systemFeedback.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(type ? { type: type as any } : {}),
    },
    include: {
      provider: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Stats
  const total = await db.systemFeedback.count()
  const newCount = await db.systemFeedback.count({ where: { status: 'NEW' } })
  const byType = await db.systemFeedback.groupBy({ by: ['type'], _count: true })

  return ok({
    feedback: feedback.map((f) => ({
      id: f.id,
      name: f.name,
      phone: f.phone,
      email: f.email,
      type: f.type,
      subject: f.subject,
      message: f.message,
      status: f.status,
      adminReply: f.adminReply,
      userRole: f.userRole,
      provider: f.provider,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    stats: {
      total,
      newCount,
      byType,
    },
  })
}
