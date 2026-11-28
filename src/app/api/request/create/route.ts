// POST /api/request/create
// Requester creates a new service request (no registration needed)
// درخواست فقط به ارائه‌دهندگانی که در محله انتخاب‌شده سرویس‌دهی دارند ارسال می‌شود
// نوتیفیکیشن از طریق اپ (درون‌برنامه‌ای) به ارائه‌دهندگان ارسال می‌شود
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, isValidPhone, toEnglishDigits } from '@/lib/http'
import {
  REQUEST_VALIDITY_MINUTES,
  EMERGENCY_VALIDITY_MINUTES,
  MAX_PROPOSALS_PER_REQUEST,
  MAX_EMERGENCY_PROPOSALS,
  parseServedNeighborhoods,
  SERVICE_TYPES,
} from '@/lib/constants'
import { ServiceType } from '@prisma/client'
import { broadcastNewRequest } from '@/lib/ws-broadcast'
import { createNotificationsBulk } from '@/lib/notification'

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
    const neighborhood = body.neighborhood?.trim() || null
    const description = body.description?.trim()
    const isEmergency = body.isEmergency === true
    const latitude = body.latitude ? Number(body.latitude) : null
    const longitude = body.longitude ? Number(body.longitude) : null

    if (!requesterName) return bad('نام الزامی است')
    if (!requesterPhone || !isValidPhone(requesterPhone)) return bad('شماره موبایل معتبر نیست (مثال: 09121234567)')
    if (!serviceType || !['NURSING', 'CAREGIVER', 'WOUND_SPECIALIST', 'MASSAGE', 'PHYSIOTHERAPY'].includes(serviceType)) {
      return bad('نوع خدمت معتبر نیست')
    }
    if (!province) return bad('استان الزامی است')
    if (!city) return bad('شهر الزامی است')
    if (!neighborhood) return bad('محله الزامی است')
    if (!description || description.length < 5) return bad('لطفاً توضیحات کاملی از نیاز خود ارائه دهید')

    const now = new Date()
    const validityMin = isEmergency ? EMERGENCY_VALIDITY_MINUTES : REQUEST_VALIDITY_MINUTES
    const expiresAt = new Date(now.getTime() + validityMin * 60 * 1000)

    const serviceRequest = await db.serviceRequest.create({
      data: {
        requesterName,
        requesterPhone,
        serviceType,
        province,
        city,
        neighborhood,
        description,
        isEmergency,
        latitude,
        longitude,
        status: 'ACTIVE',
        expiresAt,
      },
    })

    // Find approved providers that match: same province + city + serviceType
    // AND serve the requested neighborhood (servedNeighborhoods JSON includes neighborhood)
    const candidateProviders = await db.provider.findMany({
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
        servedNeighborhoods: true,
      },
    })

    // Filter by neighborhood match (provider's servedNeighborhoods contains requester's neighborhood)
    const matchingProviders = candidateProviders.filter((p) => {
      const served = parseServedNeighborhoods(p.servedNeighborhoods)
      return served.includes(neighborhood)
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
    const matchKey = `${province}:${city}:${serviceType}:${neighborhood}`
    broadcastNewRequest({
      requestId: serviceRequest.id,
      serviceType,
      province,
      city,
      region: neighborhood,
      description,
      requesterName,
      createdAt: serviceRequest.createdAt.toISOString(),
      expiresAt: serviceRequest.expiresAt.toISOString(),
      matchKey,
    })

    // Send IN-APP NOTIFICATIONS + PUSH NOTIFICATIONS to matching providers
    if (matchingProviders.length > 0) {
      const serviceLabel = SERVICE_TYPES.find((s) => s.value === serviceType)?.label || serviceType
      const notifTitle = isEmergency
        ? `🚨 درخواست اورژانسی جدید: ${serviceLabel}`
        : `درخواست جدید: ${serviceLabel}`
      const notifBody = `محله: ${neighborhood}\n${description.substring(0, 120)}\nمهلت پاسخ: ${validityMin} دقیقه`

      // 1. In-app notification
      await createNotificationsBulk(
        matchingProviders.map((p) => ({ providerId: p.id })),
        {
          type: 'NEW_REQUEST',
          title: notifTitle,
          message: notifBody,
          requestId: serviceRequest.id,
          actionUrl: `/api/provider/requests`,
          metadata: {
            serviceType,
            serviceLabel,
            neighborhood,
            isEmergency,
            validityMin,
          },
        }
      ).catch((e) => console.error('Notification creation error:', e))

      // 2. Push notification (اعلان روی صفحه موبایل — حتی اگر اپ باز نیست)
      try {
        const { sendPushToProviders } = await import('@/lib/push')
        await sendPushToProviders(
          matchingProviders.map((p) => p.id),
          {
            title: notifTitle,
            body: notifBody,
            tag: `request_${serviceRequest.id}`,
            url: '/',
          }
        )
      } catch (e) {
        console.error('Push notification error:', e)
      }
    }

    return ok({
      ok: true,
      request: {
        id: serviceRequest.id,
        requesterToken: serviceRequest.requesterToken,
        serviceType,
        province,
        city,
        neighborhood,
        description,
        isEmergency,
        expiresAt: serviceRequest.expiresAt,
        status: serviceRequest.status,
      },
      matchKey,
      matchingProvidersCount: matchingProviders.length,
      isEmergency,
      validityMinutes: validityMin,
      message: matchingProviders.length > 0
        ? isEmergency
          ? `درخواست اورژانسی شما به ${matchingProviders.length.toLocaleString('fa-IR')} ارائه‌دهنده در محله ${neighborhood} ارسال شد. مهلت پاسخ: ${validityMin} دقیقه.`
          : `درخواست شما به ${matchingProviders.length.toLocaleString('fa-IR')} ارائه‌دهنده در محله ${neighborhood} ارسال شد. لطفاً منتظر پیشنهادها بمانید.`
        : `در حال حاضر ارائه‌دهنده‌ای در محله ${neighborhood} ثبت‌نام نکرده است. درخواست شما ثبت شد ولی ممکن است پاسخی دریافت نکنید.`,
    })
  } catch (e: any) {
    console.error('Request create error:', e)
    return bad(`خطا در ثبت درخواست: ${e.message || 'نامشخص'}`, 500)
  }
}
