// GET /api/request/[id] — get request status + proposals (only first 5)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, notFound } from '@/lib/http'
import { MAX_PROPOSALS_PER_REQUEST } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Optional requester token via query param for security
  const url = new URL(request.url)
  const requesterToken = url.searchParams.get('t')

  const req = await db.serviceRequest.findUnique({
    where: { id },
    include: {
      proposals: {
        include: {
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              serviceType: true,
              province: true,
              city: true,
              region: true,
              profilePhoto: true,
              freeProposalCount: true,
              proposalsSubmitted: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_PROPOSALS_PER_REQUEST,
      },
      chat: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!req) return notFound('درخواست یافت نشد')
  if (requesterToken && requesterToken !== req.requesterToken) {
    return bad('دسترسی غیرمجاز', 403)
  }

  // Check expiry
  const now = new Date()
  if (req.status === 'ACTIVE' && now > req.expiresAt) {
    await db.serviceRequest.update({
      where: { id: req.id },
      data: { status: 'EXPIRED' },
    })
    req.status = 'EXPIRED'
  }

  // Remaining time in seconds
  const remainingSeconds = req.status === 'ACTIVE'
    ? Math.max(0, Math.floor((req.expiresAt.getTime() - now.getTime()) / 1000))
    : 0

  return ok({
    request: {
      id: req.id,
      serviceType: req.serviceType,
      province: req.province,
      city: req.city,
      region: req.neighborhood || req.region,
      neighborhood: req.neighborhood,
      description: req.description,
      status: req.status,
      createdAt: req.createdAt,
      expiresAt: req.expiresAt,
      remainingSeconds,
      selectedProviderId: req.selectedProviderId,
      proposals: req.proposals.map((p) => ({
        id: p.id,
        price: p.price,
        message: p.message,
        createdAt: p.createdAt,
        provider: p.provider,
      })),
      chatId: req.chat?.id,
    },
  })
}
