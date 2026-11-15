// POST /api/chat/[chatId]/complete — mark service as completed
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'
import { sendSMS, templateServiceCompleted } from '@/lib/sms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  try {
    const body = await request.json()
    const requesterToken = body.requesterToken

    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: {
        request: {
          select: {
            id: true,
            requesterToken: true,
            requesterName: true,
            requesterPhone: true,
            selectedProviderId: true,
            status: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            servicesCompleted: true,
            totalEarnings: true,
          },
        },
      },
    })

    if (!chat) return notFound('چت یافت نشد')

    // Determine who is completing the service
    let completedBy: 'REQUESTER' | 'PROVIDER'
    const provider = await getProviderFromRequest(request)
    if (provider && provider.id === chat.providerId) {
      completedBy = 'PROVIDER'
    } else if (requesterToken && requesterToken === chat.request.requesterToken) {
      completedBy = 'REQUESTER'
    } else {
      return unauthorized('دسترسی غیرمجاز')
    }

    if (chat.serviceStatus === 'COMPLETED') {
      return bad('این خدمت قبلاً تکمیل شده است')
    }

    // Mark as completed
    await db.chat.update({
      where: { id: chat.id },
      data: {
        serviceStatus: 'COMPLETED',
        completedAt: new Date(),
        completedBy,
      },
    })

    // Update request status
    await db.serviceRequest.update({
      where: { id: chat.request.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Increment provider's servicesCompleted counter
    await db.provider.update({
      where: { id: chat.providerId },
      data: {
        servicesCompleted: { increment: 1 },
      },
    })

    // Add system message in chat
    await db.chatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'SYSTEM',
        messageType: 'SYSTEM',
        content: completedBy === 'REQUESTER'
          ? 'درخواست‌کننده خدمت را تکمیل‌شده اعلام کرد. لطفاً در صورت انجام خدمت، تأیید کنید.'
          : 'ارائه‌دهنده خدمت را تکمیل‌شده اعلام کرد. لطفاً در صورت رضایت، به او امتیاز بدهید.',
      },
    })

    // Send SMS to requester about service completion (so they can rate)
    await sendSMS(
      chat.request.requesterPhone,
      templateServiceCompleted({ providerName: `${chat.provider.firstName} ${chat.provider.lastName}` }),
      'SERVICE_COMPLETED',
      { providerId: chat.providerId, requestId: chat.request.id }
    )

    return ok({
      ok: true,
      completedBy,
      message: 'خدمت تکمیل شد.',
      // Requester can now rate; provider has finished
      canRate: completedBy === 'PROVIDER', // requester can rate after provider marks complete
    })
  } catch (e: any) {
    console.error('Complete service error:', e)
    return bad('خطا در تکمیل خدمت', 500)
  }
}
