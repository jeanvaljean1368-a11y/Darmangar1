// GET /api/admin/requests — list all requests
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
  const serviceType = url.searchParams.get('serviceType')

  const requests = await db.serviceRequest.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(serviceType ? { serviceType: serviceType as any } : {}),
    },
    include: {
      _count: {
        select: { proposals: true },
      },
      proposals: {
        take: 5,
        select: {
          id: true,
          price: true,
          createdAt: true,
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return ok({
    requests: requests.map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      province: r.province,
      city: r.city,
      region: r.region,
      description: r.description,
      requesterName: r.requesterName,
      requesterPhone: r.requesterPhone,
      status: r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      selectedProviderId: r.selectedProviderId,
      proposalsCount: r._count.proposals,
      proposals: r.proposals,
    })),
  })
}
