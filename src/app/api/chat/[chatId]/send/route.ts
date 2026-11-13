// POST /api/chat/[chatId]/send — send a message in chat
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'
import { getSocket } from '@/lib/ws-client'
import type { MessageSender } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  try {
    const body = await request.json()
    const content = body.content?.trim()
    const requesterToken = body.requesterToken

    if (!content) return bad('متن پیام الزامی است')
    if (content.length > 1000) return bad('متن پیام نباید بیشتر از ۱۰۰۰ کاراکتر باشد')

    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: {
        request: { select: { id: true, requesterToken: true, status: true } },
      },
    })

    if (!chat) return notFound('چت یافت نشد')

    // Determine sender
    let sender: MessageSender
    const provider = await getProviderFromRequest(request)
    if (provider && provider.id === chat.providerId) {
      sender = 'PROVIDER'
    } else if (requesterToken && requesterToken === chat.request.requesterToken) {
      sender = 'REQUESTER'
    } else {
      return unauthorized('دسترسی غیرمجاز')
    }

    // Don't allow sending if request was cancelled
    if (chat.request.status === 'CANCELLED') {
      return bad('این درخواست لغو شده است')
    }

    const message = await db.chatMessage.create({
      data: {
        chatId: chat.id,
        sender,
        content,
      },
    })

    // Broadcast via WebSocket to chat room
    try {
      const socket = getSocket()
      socket.emit('chat:message', {
        chatId: chat.id,
        requestId: chat.request.id,
        sender,
        content,
        timestamp: message.createdAt.toISOString(),
      })
    } catch (e) {
      console.error('WS broadcast error:', e)
    }

    return ok({
      ok: true,
      message: {
        id: message.id,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
      },
    })
  } catch (e: any) {
    console.error('Send message error:', e)
    return bad('خطا در ارسال پیام', 500)
  }
}
