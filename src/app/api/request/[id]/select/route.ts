// POST /api/request/[id]/select — requester selects a provider to start chat
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, notFound } from '@/lib/http'
import { closeRequestBroadcast } from '@/lib/ws-broadcast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const proposalId = body.proposalId
    const requesterToken = body.requesterToken

    if (!proposalId || !requesterToken) return bad('proposalId و requesterToken الزامی است')

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id },
      include: {
        proposals: true,
      },
    })

    if (!serviceRequest) return notFound('درخواست یافت نشد')
    if (serviceRequest.requesterToken !== requesterToken) return bad('دسترسی غیرمجاز', 403)
    if (serviceRequest.status !== 'ACTIVE') return bad('این درخواست در حال حاضر قابل انتخاب نیست')

    const proposal = serviceRequest.proposals.find((p) => p.id === proposalId)
    if (!proposal) return bad('این پیشنهاد یافت نشد')

    // Create chat
    const chat = await db.chat.create({
      data: {
        requestId: serviceRequest.id,
        providerId: proposal.providerId,
      },
    })

    // Update request status to SELECTED
    await db.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: {
        status: 'SELECTED',
        selectedProviderId: proposal.providerId,
      },
    })

    // Add system message
    await db.chatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'SYSTEM',
        content: `ارتباط برقرار شد. مبلغ توافق‌شده: ${proposal.price.toLocaleString('fa-IR')} تومان`,
      },
    })

    // Broadcast to other providers that request is closed
    const matchKey = `${serviceRequest.province}:${serviceRequest.city}:${serviceRequest.serviceType}`
    closeRequestBroadcast(serviceRequest.id, matchKey, 'SELECTED')

    return ok({
      ok: true,
      chatId: chat.id,
      providerId: proposal.providerId,
      agreedPrice: proposal.price,
    })
  } catch (e: any) {
    console.error('Select error:', e)
    return bad('خطا در انتخاب ارائه‌دهنده', 500)
  }
}
