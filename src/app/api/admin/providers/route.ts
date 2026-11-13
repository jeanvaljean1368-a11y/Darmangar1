// GET /api/admin/providers — list all providers (with documents and status)
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
  const q = url.searchParams.get('q')

  const providers = await db.provider.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(serviceType ? { serviceType: serviceType as any } : {}),
      ...(q ? {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { username: { contains: q } },
          { nationalId: { contains: q } },
        ],
      } : {}),
    },
    include: {
      documents: true,
      _count: {
        select: {
          proposals: true,
          referrals: true,
          chatsAsProvider: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok({
    providers: providers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: `${p.firstName} ${p.lastName}`,
      nationalId: p.nationalId,
      username: p.username,
      serviceType: p.serviceType,
      isWoundSpecialist: p.isWoundSpecialist,
      province: p.province,
      city: p.city,
      region: p.region,
      status: p.status,
      rejectionReason: p.rejectionReason,
      profilePhoto: p.profilePhoto,
      freeProposalCount: p.freeProposalCount,
      proposalsSubmitted: p.proposalsSubmitted,
      walletBalance: p.walletBalance,
      totalPaid: p.totalPaid,
      referralCode: p.referralCode,
      referredById: p.referredById,
      createdAt: p.createdAt,
      documents: p.documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        verified: d.verified,
        createdAt: d.createdAt,
      })),
      _count: p._count,
    })),
  })
}
