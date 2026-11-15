// GET /api/admin/revenue — detailed revenue report
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  // Total revenue from PROPOSAL_FEE payments
  const revenue = await db.payment.aggregate({
    where: { type: 'PROPOSAL_FEE', status: 'COMPLETED' },
    _sum: { amount: true },
    _count: true,
  })

  // Wallet topups total
  const topups = await db.payment.aggregate({
    where: { type: 'WALLET_TOPUP', status: 'COMPLETED' },
    _sum: { amount: true },
    _count: true,
  })

  // Service payments total
  const servicePayments = await db.payment.aggregate({
    where: { type: 'SERVICE_PAYMENT', status: 'COMPLETED' },
    _sum: { amount: true },
    _count: true,
  })

  // SMS stats
  const smsStats = await db.sMSLog.groupBy({
    by: ['status'],
    _count: true,
  })

  const totalSMS = await db.sMSLog.count()
  const smsCost = await db.sMSLog.aggregate({ _sum: { cost: true } })

  // Recent transactions (last 30 days simulation - just last 20)
  const recentTx = await db.walletTransaction.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      provider: {
        select: { id: true, firstName: true, lastName: true, username: true },
      },
    },
  })

  // Daily revenue for last 7 days (group by date)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentPayments = await db.payment.findMany({
    where: {
      createdAt: { gt: sevenDaysAgo },
      status: 'COMPLETED',
    },
    select: { amount: true, type: true, createdAt: true },
  })

  // Group by day
  const byDay: Record<string, { date: string; revenue: number; topup: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    byDay[key] = { date: key, revenue: 0, topup: 0 }
  }
  recentPayments.forEach((p) => {
    const key = p.createdAt.toISOString().split('T')[0]
    if (byDay[key]) {
      if (p.type === 'PROPOSAL_FEE') byDay[key].revenue += p.amount
      if (p.type === 'WALLET_TOPUP') byDay[key].topup += p.amount
    }
  })

  return ok({
    summary: {
      totalRevenue: revenue._sum.amount || 0,
      totalTransactions: revenue._count,
      totalTopups: topups._sum.amount || 0,
      totalTopupsCount: topups._count,
      totalServicePayments: servicePayments._sum.amount || 0,
      totalServicePaymentsCount: servicePayments._count,
      sms: {
        total: totalSMS,
        cost: smsCost._sum.cost || 0,
        byStatus: smsStats,
      },
    },
    daily: Object.values(byDay),
    recentTransactions: recentTx,
  })
}
