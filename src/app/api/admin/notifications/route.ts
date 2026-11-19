// GET /api/admin/notifications — list all notifications (admin view)
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
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)

  const notifications = await db.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  })

  // Stats by type
  const byType = await db.notification.groupBy({
    by: ['type'],
    _count: true,
  })

  const totalSent = await db.notification.count()
  const totalRead = await db.notification.count({ where: { read: true } })
  const totalUnread = await db.notification.count({ where: { read: false } })

  return ok({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      readAt: n.readAt,
      requestId: n.requestId,
      createdAt: n.createdAt,
      provider: n.provider,
    })),
    stats: {
      total: totalSent,
      read: totalRead,
      unread: totalUnread,
      byType,
    },
  })
}
