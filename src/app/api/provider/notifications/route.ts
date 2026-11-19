// GET /api/provider/notifications — list notifications
// POST /api/provider/notifications — special actions (mark all as read)
import { NextRequest } from 'next/server'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import {
  getProviderNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
} from '@/lib/notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const url = new URL(request.url)
  const onlyUnread = url.searchParams.get('unread') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100)

  const [notifications, unreadCount] = await Promise.all([
    getProviderNotifications(provider.id, { onlyUnread, limit }),
    getUnreadNotificationsCount(provider.id),
  ])

  return ok({
    notifications,
    unreadCount,
  })
}

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const body = await request.json()
    if (body.action === 'mark-all-read') {
      await markAllNotificationsAsRead(provider.id)
      return ok({ ok: true })
    }
    return bad('action نامعتبر')
  } catch {
    return bad('بدنه‌ی درخواست نامعتبر')
  }
}
