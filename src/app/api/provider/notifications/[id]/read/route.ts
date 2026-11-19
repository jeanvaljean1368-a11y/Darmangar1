// POST /api/provider/notifications/[id]/read — mark one as read
import { NextRequest } from 'next/server'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/http'
import { markNotificationAsRead } from '@/lib/notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const result = await markNotificationAsRead(id, provider.id)
  if (result.count === 0) return notFound('نوتیفیکیشن یافت نشد')

  return ok({ ok: true })
}
