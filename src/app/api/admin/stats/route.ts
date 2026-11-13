// GET /api/admin/stats — admin dashboard stats
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  const [
    totalProviders,
    pendingProviders,
    approvedProviders,
    rejectedProviders,
    totalRequests,
    activeRequests,
    selectedRequests,
    expiredRequests,
    totalProposals,
    totalPayments,
    paymentsSum,
    recentProviders,
    recentRequests,
  ] = await Promise.all([
    db.provider.count(),
    db.provider.count({ where: { status: 'PENDING' } }),
    db.provider.count({ where: { status: 'APPROVED' } }),
    db.provider.count({ where: { status: 'REJECTED' } }),
    db.serviceRequest.count(),
    db.serviceRequest.count({ where: { status: 'ACTIVE' } }),
    db.serviceRequest.count({ where: { status: 'SELECTED' } }),
    db.serviceRequest.count({ where: { status: 'EXPIRED' } }),
    db.proposal.count(),
    db.payment.count(),
    db.payment.aggregate({ _sum: { amount: true } }),
    db.provider.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        serviceType: true,
        province: true,
        city: true,
        status: true,
        createdAt: true,
      },
    }),
    db.serviceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        serviceType: true,
        province: true,
        city: true,
        requesterName: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  // Providers by service type
  const byService = await db.provider.groupBy({
    by: ['serviceType'],
    _count: true,
  })

  // Providers by province
  const byProvince = await db.provider.groupBy({
    by: ['province'],
    _count: true,
    orderBy: { _count: { province: 'desc' } },
    take: 10,
  })

  return ok({
    counts: {
      totalProviders,
      pendingProviders,
      approvedProviders,
      rejectedProviders,
      totalRequests,
      activeRequests,
      selectedRequests,
      expiredRequests,
      totalProposals,
      totalPayments,
      totalRevenue: paymentsSum._sum.amount || 0,
    },
    byService: byService.map((s) => ({ serviceType: s.serviceType, count: s._count })),
    byProvince: byProvince.map((p) => ({ province: p.province, count: p._count })),
    recentProviders,
    recentRequests,
  })
}
