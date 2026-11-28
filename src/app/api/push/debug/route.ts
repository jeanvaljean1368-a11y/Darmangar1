// GET /api/push/debug — debug info about push subscriptions
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  // Get this provider's subscriptions
  const mySubs = await db.pushSubscription.findMany({
    where: { providerId: provider.id },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
    },
  })

  // Total subscriptions in system
  const totalSubs = await db.pushSubscription.count()

  return ok({
    provider: {
      id: provider.id,
      username: provider.username,
    },
    mySubscriptions: mySubs.map((s) => ({
      id: s.id,
      endpoint: s.endpoint.substring(0, 50) + '...',
      userAgent: s.userAgent?.substring(0, 50),
      createdAt: s.createdAt,
    })),
    mySubscriptionCount: mySubs.length,
    totalSubscriptionsInSystem: totalSubs,
    isConfigured: mySubs.length > 0,
  })
}
