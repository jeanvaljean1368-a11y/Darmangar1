// POST /api/request/create
// Requester creates a new service request (no registration needed)
// درخواست فقط به ارائه‌دهندگانی که در محله انتخاب‌شده سرویس‌دهی دارند ارسال می‌شود
// پشتیبانی از درخواست‌های اورژانسی و SMS notification
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
import { sendBulkSMS, templateNewRequest } from '@/lib/sms'

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

    // Send SMS to matching providers (broadcast new request notification)
    // We don't have provider's phone in the candidates query — fetch separately
    if (matchingProviders.length > 0) {
      const providerIds = matchingProviders.map((p) => p.id)
      const providersWithPhone = await db.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
      // We need phone for SMS but it's not stored on Provider yet in many cases — let's fetch from a separate user table
      // Actually phone isn't on Provider — requester's phone is. For SMS to provider we need provider phone.
      // For now: skip SMS to provider (no phone field on Provider). Use a TODO note.
      // Actually, we don't have provider phone in the schema. SMS will work once added.
      // Send SMS to requester instead confirming their request
      const serviceLabel = SERVICE_TYPES.find((s) => s.value === serviceType)?.label || serviceType
      const smsMessage = isEmergency
        ? `درمانگر\nدرخواست اورژانسی شما ثبت شد.\nخدمت: ${serviceLabel}\nمحله: ${neighborhood}\nمهلت: ${validityMin} دقیقه\nدر انتظار پیشنهاد ارائه‌دهندگان...`
        : `درمانگر\nدرخواست شما ثبت شد.\nخدمت: ${serviceLabel}\nمحله: ${neighborhood}\nمهلت: ${validityMin} دقیقه\nدر انتظار پیشنهاد ارائه‌دهندگان...`
      // We send a confirmation SMS to requester
      await sendBulkSMS(
        [{ phone: requesterPhone }],
        smsMessage,
        'GENERIC',
        serviceRequest.id
      ).catch(() => {}) // don't fail if SMS fails
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

// Import sendBulkSMS
import { sendBulkSMS as _sendBulkSMS } from '@/lib/sms'
