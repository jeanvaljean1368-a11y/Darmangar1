// GET /api/provider/history — complete history of proposals and completed services
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const url = new URL(request.url)
  const filter = url.searchParams.get('filter') || 'all' // all, completed, active, expired, cancelled
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500)

  // Get ALL proposals with full details
  const proposals = await db.proposal.findMany({
    where: { providerId: provider.id },
    include: {
      request: {
        select: {
          id: true,
          serviceType: true,
          province: true,
          city: true,
          neighborhood: true,
          description: true,
          requesterName: true,
          status: true,
          isEmergency: true,
          createdAt: true,
          completedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Get ratings received (for completed services)
  const ratings = await db.rating.findMany({
    where: { providerId: provider.id },
    include: {
      request: {
        select: {
          id: true,
          serviceType: true,
          requesterName: true,
          description: true,
          completedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Create a lookup map for ratings by requestId
  const ratingMap = new Map<string, any>()
  ratings.forEach((r) => {
    ratingMap.set(r.requestId, {
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
    })
  })

  // Format proposals
  const formattedProposals = proposals.map((p) => {
    const rating = ratingMap.get(p.requestId)
    return {
      id: p.id,
      price: p.price,
      message: p.message,
      createdAt: p.createdAt,
      // Request details
      requestId: p.request.id,
      serviceType: p.request.serviceType,
      province: p.request.province,
      city: p.request.city,
      neighborhood: p.request.neighborhood,
      description: p.request.description,
      requesterName: p.request.requesterName,
      requestStatus: p.request.status,
      isEmergency: p.request.isEmergency,
      completedAt: p.request.completedAt,
      // Rating (if any)
      rating: rating || null,
    }
  })

  // Separate completed services
  const completedServices = formattedProposals.filter((p) => p.requestStatus === 'COMPLETED')
  const activeProposals = formattedProposals.filter((p) => p.requestStatus === 'ACTIVE' || p.requestStatus === 'SELECTED')
  const expiredProposals = formattedProposals.filter((p) => p.requestStatus === 'EXPIRED')
  const cancelledProposals = formattedProposals.filter((p) => p.requestStatus === 'CANCELLED')

  // Apply filter if specified
  let filteredProposals = formattedProposals
  if (filter === 'completed') filteredProposals = completedServices
  else if (filter === 'active') filteredProposals = activeProposals
  else if (filter === 'expired') filteredProposals = expiredProposals
  else if (filter === 'cancelled') filteredProposals = cancelledProposals

  // Stats
  const stats = {
    total: formattedProposals.length,
    completed: completedServices.length,
    active: activeProposals.length,
    expired: expiredProposals.length,
    cancelled: cancelledProposals.length,
    // Total earnings from completed services
    totalEarnings: completedServices.reduce((sum, p) => sum + p.price, 0),
    // Average rating
    avgRating: ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 10) / 10 : 0,
    totalRatings: ratings.length,
  }

  return ok({
    proposals: filteredProposals,
    completedServices,
    stats,
  })
}
