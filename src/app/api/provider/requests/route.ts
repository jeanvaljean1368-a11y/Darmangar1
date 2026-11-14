// GET /api/provider/requests — list active requests matching provider's served neighborhoods + serviceType
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'
import { MAX_PROPOSALS_PER_REQUEST, parseServedNeighborhoods } from '@/lib/constants'

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
      servedNeighborhoods: true,
    },
  })

  if (!full) return unauthorized()
  if (full.status !== 'APPROVED') {
    return ok({
      provider: {
        id: full.id,
        serviceType: full.serviceType,
        province: full.province,
        city: full.city,
        status: full.status,
        freeProposalCount: full.freeProposalCount,
        proposalsSubmitted: full.proposalsSubmitted,
        walletBalance: full.walletBalance,
      },
      activeRequests: [],
      myProposals: [],
      message: 'حساب شما هنوز توسط مدیر تأیید نشده است.',
    })
  }

  // Parse provider's served neighborhoods
  const servedNeighborhoods = parseServedNeighborhoods(full.servedNeighborhoods)

  // Find active requests in provider's province + city + serviceType
  // Then filter by neighborhood match (requester's neighborhood is in provider's servedNeighborhoods)
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
    },
    include: {
      proposals: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Filter: only requests where requester's neighborhood is in provider's served list
  // AND requests with < 5 proposals
  const activeRequests = requests
    .filter((r) => {
      // Neighborhood match: provider serves requester's neighborhood
      if (r.neighborhood && !servedNeighborhoods.includes(r.neighborhood)) {
        return false
      }
      // Cap of 5 proposals not yet reached
      if (r.proposals.length >= MAX_PROPOSALS_PER_REQUEST) {
        return false
      }
      return true
    })
    .map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      province: r.province,
      city: r.city,
      region: r.neighborhood || r.region,
      neighborhood: r.neighborhood,
      description: r.description,
      requesterName: r.requesterName,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      remainingSeconds: Math.max(0, Math.floor((r.expiresAt.getTime() - now.getTime()) / 1000)),
      proposalsCount: r.proposals.length,
      maxProposals: MAX_PROPOSALS_PER_REQUEST,
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
          neighborhood: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return ok({
    provider: {
      id: full.id,
      serviceType: full.serviceType,
      province: full.province,
      city: full.city,
      status: full.status,
      freeProposalCount: full.freeProposalCount,
      proposalsSubmitted: full.proposalsSubmitted,
      walletBalance: full.walletBalance,
      servedNeighborhoods,
    },
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
