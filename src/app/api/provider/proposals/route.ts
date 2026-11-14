// POST /api/provider/proposals — provider submits a proposal for a request
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import { MAX_PROPOSALS_PER_REQUEST, PROPOSAL_FEE } from '@/lib/constants'
import { notifyNewProposal } from '@/lib/ws-broadcast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const body = await request.json()
    const requestId = body.requestId
    const price = Number(body.price)
    const message = body.message?.trim() || null

    if (!requestId) return bad('requestId الزامی است')
    if (!price || price < 10000) return bad('مبلغ پیشنهادی باید حداقل ۱۰,۰۰۰ تومان باشد')

    const fullProvider = await db.provider.findUnique({
      where: { id: provider.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        serviceType: true,
        province: true,
        city: true,
        freeProposalCount: true,
        proposalsSubmitted: true,
        walletBalance: true,
        totalPaid: true,
      },
    })

    if (!fullProvider) return unauthorized()
    if (fullProvider.status !== 'APPROVED') return bad('حساب شما هنوز توسط مدیر تأیید نشده است')

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: { proposals: true },
    })

    if (!serviceRequest) return bad('درخواست یافت نشد')

    // Validate match
    if (serviceRequest.province !== fullProvider.province ||
        serviceRequest.city !== fullProvider.city ||
        serviceRequest.serviceType !== fullProvider.serviceType) {
      return bad('این درخواست با منطقه یا تخصص شما مطابقت ندارد')
    }

    // Check request status
    if (serviceRequest.status !== 'ACTIVE') {
      return bad('این درخواست دیگر فعال نیست')
    }

    // Check expiry
    if (new Date() > serviceRequest.expiresAt) {
      await db.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: 'EXPIRED' } })
      return bad('مهلت این درخواست به پایان رسیده است')
    }

    // Check if already proposed
    const existing = serviceRequest.proposals.find((p) => p.providerId === fullProvider.id)
    if (existing) return bad('شما قبلاً برای این درخواست پیشنهاد ثبت کرده‌اید')

    // Check if 5 proposals already submitted
    if (serviceRequest.proposals.length >= MAX_PROPOSALS_PER_REQUEST) {
      return bad('این درخواست به حداکثر تعداد پیشنهادها (۵ نفر) رسیده است')
    }

    // Determine fee for this proposal
    const isFree = fullProvider.proposalsSubmitted < fullProvider.freeProposalCount
    const fee = isFree ? 0 : PROPOSAL_FEE

    // For demo: we proceed with proposal even if fee > 0 (no payment gateway).
    // In production: would integrate with payment gateway here.
    // For now: deduct from wallet balance or record as owed.

    // Create proposal
    const proposal = await db.proposal.create({
      data: {
        requestId: serviceRequest.id,
        providerId: fullProvider.id,
        price,
        message,
      },
    })

    // Update provider counters
    await db.provider.update({
      where: { id: fullProvider.id },
      data: {
        proposalsSubmitted: { increment: 1 },
        walletBalance: { decrement: fee },
        totalPaid: { increment: fee },
      },
    })

    // Record payment if fee was charged
    if (fee > 0) {
      await db.payment.create({
        data: {
          providerId: fullProvider.id,
          amount: fee,
          type: 'PROPOSAL_FEE',
          proposalId: proposal.id,
          description: `هزینه پیشنهاد برای درخواست ${serviceRequest.id.substring(0, 8)}`,
        },
      })
    }

    // Mark received request as responded
    await db.receivedRequest.updateMany({
      where: { requestId: serviceRequest.id, providerId: fullProvider.id },
      data: { responded: true },
    })

    // Notify requester via WebSocket
    notifyNewProposal({
      requestId: serviceRequest.id,
      providerId: fullProvider.id,
      providerName: `${fullProvider.firstName} ${fullProvider.lastName}`,
      price,
      message: message || undefined,
      proposalId: proposal.id,
    })

    const updatedProvider = await db.provider.findUnique({
      where: { id: fullProvider.id },
      select: {
        freeProposalCount: true,
        proposalsSubmitted: true,
        walletBalance: true,
        totalPaid: true,
      },
    })

    return ok({
      ok: true,
      proposal: {
        id: proposal.id,
        price: proposal.price,
        message: proposal.message,
        createdAt: proposal.createdAt,
      },
      fee,
      freeRemaining: Math.max(0, (updatedProvider?.freeProposalCount || 0) - (updatedProvider?.proposalsSubmitted || 0)),
      provider: updatedProvider,
      message: fee > 0
        ? `پیشنهاد ثبت شد. ${fee.toLocaleString('fa-IR')} تومان از حساب شما کسر و به صندوق سیستم واریز شد.`
        : 'پیشنهاد ثبت شد (پیشنهاد رایگان).',
    })
  } catch (e: any) {
    console.error('Submit proposal error:', e)
    return bad(`خطا در ثبت پیشنهاد: ${e.message || 'نامشخص'}`, 500)
  }
}
