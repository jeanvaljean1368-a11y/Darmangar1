// GET /api/provider/requests — list active requests matching provider's region+serviceType
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const full = await db.provider.findUnique({
    where: { id: provider.id },
    select: {
      id: true,
      serviceType: true,
      province: true,
      city: true,
      status: true,
      freeProposalCount: true,
      proposalsSubmitted: true,
      walletBalance: true,
    },
  })

  if (!full) return unauthorized()
  if (full.status !== 'APPROVED') {
    return ok({
      provider: full,
      requests: [],
      message: 'حساب شما هنوز توسط مدیر تأیید نشده است.',
    })
  }

  // Find active requests in provider's region + serviceType that haven't been responded to by this provider yet
  const now = new Date()
  const requests = await db.serviceRequest.findMany({
    where: {
      province: full.province,
      city: full.city,
      serviceType: full.serviceType,
      status: 'ACTIVE',
      expiresAt: { gt: now },
      // NOT already proposed by this provider
      proposals: {
        none: { providerId: full.id },
      },
      // Cap of 5 proposals not yet reached
      // We need to count proposals
    },
    include: {
      proposals: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Filter: only requests with < 5 proposals
  const MAX_PROPOSALS = 5
  const activeRequests = requests
    .filter((r) => r.proposals.length < MAX_PROPOSALS)
    .map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      province: r.province,
      city: r.city,
      region: r.region,
      description: r.description,
      requesterName: r.requesterName,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      remainingSeconds: Math.max(0, Math.floor((r.expiresAt.getTime() - now.getTime()) / 1000)),
      proposalsCount: r.proposals.length,
      maxProposals: MAX_PROPOSALS,
    }))

  // Get provider's own submitted proposals (with status of the request)
  const myProposals = await db.proposal.findMany({
    where: { providerId: full.id },
    include: {
      request: {
        select: {
          id: true,
          serviceType: true,
          province: true,
          city: true,
          description: true,
          requesterName: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return ok({
    provider: full,
    activeRequests,
    myProposals: myProposals.map((p) => ({
      id: p.id,
      price: p.price,
      message: p.message,
      createdAt: p.createdAt,
      request: p.request,
    })),
  })
}
