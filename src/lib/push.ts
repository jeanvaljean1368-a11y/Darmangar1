// Push notification system for درمانگر
// ارسال اعلان Push به ارائه‌دهندگان — حتی وقتی اپ باز نیست

import webpush from 'web-push'
import { db } from './db'

// VAPID keys — در production باید در env vars ست بشن
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDCozsZVmmwKbKwk459KaAkb9c6-kVroHFuJDkt0suMAMJCsXs9VwIEBIdrn9skj0AIOi0apDlQ5t1JQM7N3Brs'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '6Fbapo9sWDTiPR9pKlnqGZ5MJXB53TiqRCDvFH-aHGg'

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@darmanegar.ir',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
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
      // 404 or 410 = subscription expired, delete it
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
      failed++
    }
  }

  return { sent, failed }
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

// Save push subscription
export async function savePushSubscription(
  providerId: string,
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  },
  userAgent?: string
): Promise<void> {
  // Upsert — اگر قبلاً ثبت شده، آپدیت کن
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      providerId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
    update: {
      providerId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
  })
}

// Remove push subscription
export async function removePushSubscription(endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({
    where: { endpoint },
  })
}
