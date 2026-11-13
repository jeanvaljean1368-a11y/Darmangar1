// POST /api/request/create
// Requester creates a new service request (no registration needed)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, isValidPhone, toEnglishDigits } from '@/lib/http'
import { REQUEST_VALIDITY_MINUTES, MAX_PROPOSALS_PER_REQUEST } from '@/lib/constants'
import { ServiceType } from '@prisma/client'
import { broadcastNewRequest } from '@/lib/ws-broadcast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requesterName = body.requesterName?.trim()
    const requesterPhone = toEnglishDigits(body.requesterPhone?.trim() || '')
    const serviceType = body.serviceType as ServiceType
    const province = body.province?.trim()
    const city = body.city?.trim()
    const region = body.region?.trim() || null
    const address = body.address?.trim() || null
    const description = body.description?.trim()

    if (!requesterName) return bad('نام الزامی است')
    if (!requesterPhone || !isValidPhone(requesterPhone)) return bad('شماره موبایل معتبر نیست (مثال: 09121234567)')
    if (!serviceType || !['NURSING', 'CAREGIVER', 'WOUND_SPECIALIST', 'MASSAGE', 'PHYSIOTHERAPY'].includes(serviceType)) {
      return bad('نوع خدمت معتبر نیست')
    }
    if (!province) return bad('استان الزامی است')
    if (!city) return bad('شهر الزامی است')
    if (!description || description.length < 5) return bad('لطفاً توضیحات کاملی از نیاز خود ارائه دهید')

    const now = new Date()
    const expiresAt = new Date(now.getTime() + REQUEST_VALIDITY_MINUTES * 60 * 1000)

    const serviceRequest = await db.serviceRequest.create({
      data: {
        requesterName,
        requesterPhone,
        serviceType,
        province,
        city,
        region,
        address,
        description,
        status: 'ACTIVE',
        expiresAt,
      },
    })

    // Find approved providers in matching region + serviceType
    const matchingProviders = await db.provider.findMany({
      where: {
        province,
        city,
        serviceType,
        status: 'APPROVED',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        province: true,
        city: true,
        serviceType: true,
      },
    })

    // Record which providers were notified (for cap tracking)
    if (matchingProviders.length > 0) {
      await db.receivedRequest.createMany({
        data: matchingProviders.map((p) => ({
          requestId: serviceRequest.id,
          providerId: p.id,
        })),
      })
    }

    // Broadcast via WebSocket to matching providers
    const matchKey = `${province}:${city}:${serviceType}`
    broadcastNewRequest({
      requestId: serviceRequest.id,
      serviceType,
      province,
      city,
      region,
      description,
      requesterName,
      createdAt: serviceRequest.createdAt.toISOString(),
      expiresAt: serviceRequest.expiresAt.toISOString(),
      matchKey,
    })

    return ok({
      ok: true,
      request: {
        id: serviceRequest.id,
        requesterToken: serviceRequest.requesterToken,
        serviceType,
        province,
        city,
        region,
        description,
        expiresAt: serviceRequest.expiresAt,
        status: serviceRequest.status,
      },
      matchKey,
      matchingProvidersCount: matchingProviders.length,
      message: matchingProviders.length > 0
        ? `درخواست شما به ${matchingProviders.length} ارائه‌دهنده در منطقه ارسال شد. لطفاً منتظر پیشنهادها بمانید.`
        : 'در حال حاضر ارائه‌دهنده‌ای در این منطقه ثبت‌نام نکرده است. درخواست شما ثبت شد ولی ممکن است پاسخی دریافت نکنید.',
    })
  } catch (e: any) {
    console.error('Request create error:', e)
    return bad(`خطا در ثبت درخواست: ${e.message || 'نامشخص'}`, 500)
  }
}
