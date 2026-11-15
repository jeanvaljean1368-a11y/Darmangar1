// GET /api/provider/[id]/profile — public provider profile (visible to requester)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound } from '@/lib/http'
import { getProviderRatingSummary } from '@/lib/rating'
import { getProviderWorkingHours } from '@/lib/working-hours'
import { parseServedNeighborhoods } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const provider = await db.provider.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      serviceType: true,
      isWoundSpecialist: true,
      province: true,
      city: true,
      servedNeighborhoods: true,
      profilePhoto: true,
      bio: true,
      status: true,
      servicesCompleted: true,
      proposalsSubmitted: true,
      createdAt: true,
      _count: {
        select: { ratingsReceived: true },
      },
    },
  })

  if (!provider) return notFound('ارائه‌دهنده یافت نشد')
  if (provider.status !== 'APPROVED') return notFound('ارائه‌دهنده در دسترس نیست')

  const [ratingSummary, workingHours] = await Promise.all([
    getProviderRatingSummary(provider.id),
    getProviderWorkingHours(provider.id),
  ])

  return ok({
    provider: {
      id: provider.id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      fullName: `${provider.firstName} ${provider.lastName}`,
      serviceType: provider.serviceType,
      isWoundSpecialist: provider.isWoundSpecialist,
      province: provider.province,
      city: provider.city,
      servedNeighborhoods: parseServedNeighborhoods(provider.servedNeighborhoods),
      profilePhoto: provider.profilePhoto,
      bio: provider.bio,
      servicesCompleted: provider.servicesCompleted,
      proposalsSubmitted: provider.proposalsSubmitted,
      memberSince: provider.createdAt,
      rating: ratingSummary,
      workingHours,
    },
  })
}
