// GET /api/admin/sms — SMS log list
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

  const sms = await db.sMSLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      provider: {
        select: { id: true, firstName: true, lastName: true, username: true },
      },
    },
  })

  return ok({ sms })
}
