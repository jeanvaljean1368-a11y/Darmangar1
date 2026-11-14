// GET /api/chat/[chatId]/messages — list messages in a chat
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  const url = new URL(request.url)
  const requesterToken = url.searchParams.get('t')

  const chat = await db.chat.findUnique({
    where: { id: chatId },
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
          requesterPhone: true,
          requesterToken: true,
          address: true,
        },
      },
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          serviceType: true,
          province: true,
          city: true,
          profilePhoto: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!chat) return notFound('چت یافت نشد')

  // Authorization: either the provider (via token) or the requester (via requesterToken)
  let isProvider = false
  const provider = await getProviderFromRequest(request)
  if (provider && provider.id === chat.providerId) {
    isProvider = true
  } else if (requesterToken && requesterToken === chat.request.requesterToken) {
    // requester authorized
  } else {
    return unauthorized('دسترسی غیرمجاز')
  }

  return ok({
    chat: {
      id: chat.id,
      isProvider,
      provider: chat.provider,
      request: {
        ...chat.request,
        // Don't expose requester phone to requester themselves (they know it)
        requesterPhone: isProvider ? chat.request.requesterPhone : undefined,
      },
      messages: chat.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
    },
  })
}
