// GET /api/provider/me
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const full = await db.provider.findUnique({
    where: { id: provider.id },
    include: {
      documents: true,
      chatsAsProvider: {
        include: {
          request: {
            select: {
              id: true,
              serviceType: true,
              province: true,
              city: true,
              region: true,
              description: true,
              requesterName: true,
              status: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
  if (!full) return unauthorized()

  return ok({
    provider: {
      id: full.id,
      username: full.username,
      firstName: full.firstName,
      lastName: full.lastName,
      nationalId: full.nationalId,
      serviceType: full.serviceType,
      status: full.status,
      rejectionReason: full.rejectionReason,
      province: full.province,
      city: full.city,
      region: full.region,
      profilePhoto: full.profilePhoto,
      freeProposalCount: full.freeProposalCount,
      proposalsSubmitted: full.proposalsSubmitted,
      walletBalance: full.walletBalance,
      totalPaid: full.totalPaid,
      referralCode: full.referralCode,
      isWoundSpecialist: full.isWoundSpecialist,
      documents: full.documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        verified: d.verified,
      })),
      chats: full.chatsAsProvider,
    },
  })
}
