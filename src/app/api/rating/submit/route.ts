// POST /api/rating/submit — requester rates a provider after service completion
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, notFound } from '@/lib/http'
import { notifyNewRating } from '@/lib/notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requestId = body.requestId
    const requesterToken = body.requesterToken
    const stars = Number(body.stars)
    const comment = body.comment?.trim() || null

    if (!requestId || !requesterToken) return bad('requestId و requesterToken الزامی است')
    if (!stars || stars < 1 || stars > 5) return bad('امتیاز باید بین ۱ تا ۵ باشد')
    if (comment && comment.length > 500) return bad('نظر نباید بیشتر از ۵۰۰ کاراکتر باشد')

    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        chat: true,
      },
    })
    if (!serviceRequest) return notFound('درخواست یافت نشد')
    if (serviceRequest.requesterToken !== requesterToken) return bad('دسترسی غیرمجاز', 403)
    if (!serviceRequest.selectedProviderId) return bad('هنوز ارائه‌دهنده‌ای انتخاب نشده است')
    if (serviceRequest.status !== 'COMPLETED' && serviceRequest.chat?.serviceStatus !== 'COMPLETED') {
      return bad('امتیازدهی فقط پس از تکمیل خدمت ممکن است')
    }

    // Check if already rated
    const existing = await db.rating.findUnique({
      where: {
        requestId_providerId: {
          requestId: serviceRequest.id,
          providerId: serviceRequest.selectedProviderId,
        },
      },
    })
    if (existing) return bad('شما قبلاً به این ارائه‌دهنده امتیاز داده‌اید')

    const rating = await db.rating.create({
      data: {
        providerId: serviceRequest.selectedProviderId,
        requestId: serviceRequest.id,
        stars,
        comment,
      },
    })

    // Send in-app notification to provider about new rating
    await notifyNewRating(serviceRequest.selectedProviderId, {
      requestId: serviceRequest.id,
      stars,
      comment: comment || undefined,
    }).catch(() => {})

    return ok({
      ok: true,
      rating: {
        id: rating.id,
        stars: rating.stars,
        comment: rating.comment,
        createdAt: rating.createdAt,
      },
      message: 'امتیاز شما با موفقیت ثبت شد. از پاسخگویی شما سپاسگزاریم.',
    })
  } catch (e: any) {
    console.error('Rating submit error:', e)
    return bad('خطا در ثبت امتیاز', 500)
  }
}
