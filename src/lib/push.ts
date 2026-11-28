// Push notification system for درمانگر
// ارسال اعلان Push به ارائه‌دهندگان — حتی وقتی اپ باز نیست
// web-push به‌صورت داینامیک import می‌شود تا با Vercel serverless سازگار باشد

import { db } from './db'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDCozsZVmmwKbKwk459KaAkb9c6-kVroHFuJDkt0suMAMJCsXs9VwIEBIdrn9skj0AIOi0apDlQ5t1JQM7N3Brs'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '6Fbapo9sWDTiPR9pKlnqGZ5MJXB53TiqRCDvFH-aHGg'

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

// Lazy load web-push only when needed (sending notifications)
let webpushConfigured = false
async function ensureWebPush() {
  if (webpushConfigured) return
  const webpush = await import('web-push')
  webpush.setVapidDetails(
    'mailto:admin@darmanegar.ir',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
  webpushConfigured = true
  return webpush
}

// Send push notification to a specific provider
export async function sendPushToProvider(
  providerId: string,
  payload: {
    title: string
    body: string
    tag?: string
    url?: string
  }
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { providerId },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  try {
    const webpush = await ensureWebPush()
    if (!webpush) {
      console.error('web-push not available')
      return { sent: 0, failed: subscriptions.length }
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'darmanegar',
      url: payload.url || '/',
      icon: '/darmanegar-logo.png',
      badge: '/darmanegar-logo.png',
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload
        )
        sent++
      } catch (error: any) {
        console.error(`Push failed for ${sub.endpoint}:`, error.statusCode)
        if (error.statusCode === 404 || error.statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
        failed++
      }
    }

    return { sent, failed }
  } catch (e) {
    console.error('sendPushToProvider error:', e)
    return { sent: 0, failed: subscriptions.length }
  }
}

// Send push notification to multiple providers
export async function sendPushToProviders(
  providerIds: string[],
  payload: {
    title: string
    body: string
    tag?: string
    url?: string
  }
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0
  let totalFailed = 0

  for (const providerId of providerIds) {
    const result = await sendPushToProvider(providerId, payload)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return { sent: totalSent, failed: totalFailed }
}
