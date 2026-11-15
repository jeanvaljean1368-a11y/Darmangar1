// SMS notification service for درمانگر
// Supports Kavenegar and FarazSMS gateways, with a mock mode for development.
// Configure via environment variables:
//   SMS_PROVIDER=kavenegar|farazsms|mock  (default: mock)
//   KAVENEGAR_API_KEY=...
//   FARAZSMS_USERNAME=...
//   FARAZSMS_PASSWORD=...
//   FARAZSMS_SENDER=...
//   SMS_FROM=... (sender number/originator)

import { db } from './db'
import type { SMSType } from '@prisma/client'

export type SMSProvider = 'kavenegar' | 'farazsms' | 'mock'

export interface SMSConfig {
  provider: SMSProvider
  apiKey?: string
  username?: string
  password?: string
  sender?: string
  from?: string
}

let cachedConfig: SMSConfig | null = null

export function getSMSConfig(): SMSConfig {
  if (cachedConfig) return cachedConfig
  const provider = (process.env.SMS_PROVIDER as SMSProvider) || 'mock'
  cachedConfig = {
    provider,
    apiKey: process.env.KAVENEGAR_API_KEY,
    username: process.env.FARAZSMS_USERNAME,
    password: process.env.FARAZSMS_PASSWORD,
    sender: process.env.FARAZSMS_SENDER,
    from: process.env.SMS_FROM || '1000596446',
  }
  return cachedConfig
}

export interface SendSMSResult {
  ok: boolean
  status: 'sent' | 'failed' | 'mock'
  trackingCode?: string
  cost?: number // toman
  error?: string
}

export async function sendSMS(
  to: string,
  message: string,
  type: SMSType = 'GENERIC',
  context?: { providerId?: string; requestId?: string }
): Promise<SendSMSResult> {
  const config = getSMSConfig()
  // Normalize phone (Iranian mobiles start with 09)
  const normalized = normalizeIranPhone(to)
  if (!normalized) {
    return { ok: false, status: 'failed', error: 'شماره موبایل نامعتبر است' }
  }

  // Truncate message to 600 chars (SMS standard)
  const finalMessage = message.substring(0, 600)

  let result: SendSMSResult
  try {
    if (config.provider === 'mock' || !config.apiKey) {
      // Mock mode — log only
      console.log(`[SMS MOCK] To: ${normalized} | Type: ${type} | Message: ${finalMessage}`)
      result = { ok: true, status: 'mock', cost: 0 }
    } else if (config.provider === 'kavenegar') {
      result = await sendViaKavenegar(normalized, finalMessage, config)
    } else if (config.provider === 'farazsms') {
      result = await sendViaFarazSMS(normalized, finalMessage, config)
    } else {
      result = { ok: false, status: 'failed', error: 'پیکربندی SMS نامعتبر است' }
    }
  } catch (e: any) {
    result = { ok: false, status: 'failed', error: e.message || 'خطای نامشخص' }
  }

  // Log to database
  try {
    await db.sMSLog.create({
      data: {
        to: normalized,
        message: finalMessage,
        type,
        providerId: context?.providerId,
        requestId: context?.requestId,
        status: result.status,
        gateway: config.provider,
        cost: result.cost || 0,
      },
    })
  } catch (e) {
    // Don't fail SMS send if logging fails
    console.error('SMS log save error:', e)
  }

  return result
}

// Send to multiple recipients
export async function sendBulkSMS(
  recipients: { phone: string; providerId?: string }[],
  message: string,
  type: SMSType = 'GENERIC',
  requestId?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  // Send sequentially to avoid rate limits
  for (const r of recipients) {
    const res = await sendSMS(r.phone, message, type, { providerId: r.providerId, requestId })
    if (res.ok) sent++
    else failed++
  }
  return { sent, failed }
}

// === Kavenegar ===
async function sendViaKavenegar(to: string, message: string, config: SMSConfig): Promise<SendSMSResult> {
  const url = `https://api.kavenegar.com/v1/${config.apiKey}/sms/send.json`
  const params = new URLSearchParams({
    receptor: to,
    message,
    sender: config.from || '',
  })
  const res = await fetch(`${url}?${params.toString()}`, { method: 'GET' })
  const data = await res.json()
  if (data?.return?.status === 200 && data?.entries?.[0]) {
    return {
      ok: true,
      status: 'sent',
      trackingCode: String(data.entries[0].messageid || ''),
      cost: Number(data.entries[0].cost || 0) / 10, // rial to toman
    }
  }
  return { ok: false, status: 'failed', error: data?.return?.message || 'خطای درگاه' }
}

// === FarazSMS ===
async function sendViaFarazSMS(to: string, message: string, config: SMSConfig): Promise<SendSMSResult> {
  const url = 'https://ippanel.com/services.jspd'
  const body = {
    op: 'send',
    uname: config.username,
    pass: config.password,
    from: config.from,
    to: [to],
    message,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.status === 0 || data?.id) {
    return {
      ok: true,
      status: 'sent',
      trackingCode: String(data.id || ''),
      cost: 0,
    }
  }
  return { ok: false, status: 'failed', error: data?.msg || 'خطای درگاه' }
}

// Normalize Iranian phone number
function normalizeIranPhone(phone: string): string | null {
  let p = phone.replace(/[\s\-()]/g, '')
  // Convert Persian/Arabic digits
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  p = p.replace(/[۰-۹٠-٩]/g, (c) => String(persian.indexOf(c) >= 0 ? persian.indexOf(c) : arabic.indexOf(c)))
  // 09XXXXXXXXX
  if (/^09\d{9}$/.test(p)) return p
  // +989XXXXXXXXX → 09XXXXXXXXX
  if (/^\+989\d{9}$/.test(p)) return '0' + p.substring(3)
  // 00989XXXXXXXXX → 09XXXXXXXXX
  if (/^00989\d{9}$/.test(p)) return '0' + p.substring(4)
  // 989XXXXXXXXX → 09XXXXXXXXX
  if (/^989\d{9}$/.test(p)) return '0' + p.substring(2)
  return null
}

// === Templates ===

export function templateNewRequest(data: {
  requesterName: string
  serviceTypeLabel: string
  neighborhood: string
  description: string
  remainingMin: number
}): string {
  return `درمانگر\nدرخواست جدید ${data.serviceTypeLabel}\nمحله: ${data.neighborhood}\n${data.description.substring(0, 80)}\nمهلت پاسخ: ${data.remainingMin} دقیقه\nدرمانگر.ir`
}

export function templateRequestSelected(data: {
  requesterName: string
  price: number
}): string {
  return `درمانگر\n${data.requesterName} شما را انتخاب کرد.\nمبلغ توافق‌شده: ${data.price.toLocaleString('fa-IR')} تومان\nجهت چت وارد اپ شوید.`
}

export function templateProposalReceived(data: {
  providerName: string
  price: number
}): string {
  return `درمانگر\nپیشنهاد جدید از ${data.providerName}\nمبلغ: ${data.price.toLocaleString('fa-IR')} تومان\nجهت مشاهده وارد اپ شوید.`
}

export function templateServiceCompleted(data: {
  providerName: string
}): string {
  return `درمانگر\nخدمت توسط ${data.providerName} تکمیل شد.\nلطفاً به ارائه‌دهنده امتیاز بدهید.\nدرمانگر.ir`
}

export function templateWalletTopup(data: {
  amount: number
  balance: number
}): string {
  return `درمانگر\nکیف پول شما ${data.amount.toLocaleString('fa-IR')} تومان شارژ شد.\nموجودی فعلی: ${data.balance.toLocaleString('fa-IR')} تومان`
}
