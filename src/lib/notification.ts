// In-app notification system for درمانگر
// جایگزین SMS — نوتیفیکیشن‌ها در داخل اپ نمایش داده می‌شوند

import { db } from './db'
import type { NotificationType } from '@prisma/client'

export interface CreateNotificationParams {
  providerId: string
  type: NotificationType
  title: string
  message: string
  requestId?: string
  actionUrl?: string
  metadata?: Record<string, any>
}

// ایجاد یک نوتیفیکیشن برای ارائه‌دهنده
export async function createNotification(params: CreateNotificationParams) {
  const notification = await db.notification.create({
    data: {
      providerId: params.providerId,
      type: params.type,
      title: params.title,
      message: params.message,
      requestId: params.requestId,
      actionUrl: params.actionUrl,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  })
  return notification
}

// ایجاد نوتیفیکیشن برای چند ارائه‌دهنده (bulk)
export async function createNotificationsBulk(
  recipients: { providerId: string }[],
  params: Omit<CreateNotificationParams, 'providerId'>
) {
  if (recipients.length === 0) return []
  const data = recipients.map((r) => ({
    providerId: r.providerId,
    type: params.type,
    title: params.title,
    message: params.message,
    requestId: params.requestId,
    actionUrl: params.actionUrl,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  }))
  const result = await db.notification.createMany({ data })
  return result
}

// دریافت نوتیفیکیشن‌های ارائه‌دهنده (آخرین‌ها)
export async function getProviderNotifications(providerId: string, options: {
  onlyUnread?: boolean
  limit?: number
} = {}) {
  const limit = options.limit || 20
  const notifications = await db.notification.findMany({
    where: {
      providerId,
      ...(options.onlyUnread ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    readAt: n.readAt,
    requestId: n.requestId,
    actionUrl: n.actionUrl,
    metadata: n.metadata ? safeParse(n.metadata) : null,
    createdAt: n.createdAt,
  }))
}

// شمارش نوتیفیکیشن‌های خوانده‌نشده
export async function getUnreadNotificationsCount(providerId: string): Promise<number> {
  return db.notification.count({
    where: { providerId, read: false },
  })
}

// علامت‌گذاری به‌عنوان خوانده‌شده
export async function markNotificationAsRead(notificationId: string, providerId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, providerId }, // ensure ownership
    data: { read: true, readAt: new Date() },
  })
}

// علامت‌گذاری همه به‌عنوان خوانده‌شده
export async function markAllNotificationsAsRead(providerId: string) {
  return db.notification.updateMany({
    where: { providerId, read: false },
    data: { read: true, readAt: new Date() },
  })
}

// حذف نوتیفیکیشن قدیمی (پاک‌سازی خودکار بعد از ۳۰ روز)
export async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return db.notification.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo }, read: true },
  })
}

// === Helper: type-specific notification creation ===

export async function notifyNewRequest(providerId: string, data: {
  requestId: string
  serviceTypeLabel: string
  neighborhood: string
  description: string
  isEmergency: boolean
  validityMin: number
}) {
  return createNotification({
    providerId,
    type: 'NEW_REQUEST',
    title: data.isEmergency ? `🚨 درخواست اورژانسی جدید` : `درخواست جدید ${data.serviceTypeLabel}`,
    message: `محله: ${data.neighborhood}\n${data.description.substring(0, 100)}\nمهلت پاسخ: ${data.validityMin} دقیقه`,
    requestId: data.requestId,
    actionUrl: `/api/provider/requests`,
    metadata: {
      serviceType: data.serviceTypeLabel,
      neighborhood: data.neighborhood,
      isEmergency: data.isEmergency,
      validityMin: data.validityMin,
    },
  })
}

export async function notifyRequestSelected(providerId: string, data: {
  requestId: string
  requesterName: string
  price: number
}) {
  return createNotification({
    providerId,
    type: 'REQUEST_SELECTED',
    title: `✅ شما انتخاب شدید`,
    message: `${data.requesterName} شما را برای خدمت انتخاب کرد.\nمبلغ توافق‌شده: ${data.price.toLocaleString('fa-IR')} تومان`,
    requestId: data.requestId,
    actionUrl: `/api/provider/requests`,
  })
}

export async function notifyServiceCompleted(providerId: string, data: {
  requestId: string
  completedBy: string
}) {
  return createNotification({
    providerId,
    type: 'SERVICE_COMPLETED',
    title: `🎉 خدمت تکمیل شد`,
    message: `خدمت توسط ${data.completedBy === 'REQUESTER' ? 'درخواست‌کننده' : 'شما'} تکمیل شد.`,
    requestId: data.requestId,
  })
}

export async function notifyDocumentVerified(providerId: string) {
  return createNotification({
    providerId,
    type: 'DOCUMENT_VERIFIED',
    title: `✅ مدارک تأیید شد`,
    message: `مدارک شما توسط مدیر سیستم تأیید شد. اکنون می‌توانید به درخواست‌ها پاسخ دهید.`,
  })
}

export async function notifyDocumentRejected(providerId: string, reason: string) {
  return createNotification({
    providerId,
    type: 'DOCUMENT_REJECTED',
    title: `❌ مدارک رد شد`,
    message: `مدارک شما رد شد. دلیل: ${reason}`,
  })
}

export async function notifyNewRating(providerId: string, data: {
  requestId: string
  stars: number
  comment?: string
}) {
  return createNotification({
    providerId,
    type: 'NEW_RATING',
    title: `⭐ امتیاز جدید: ${data.stars} ستاره`,
    message: data.comment ? `امتیاز ${data.stars} ستاره دریافت کردید.\nنظر: "${data.comment.substring(0, 100)}"` : `امتیاز ${data.stars} ستاره دریافت کردید.`,
    requestId: data.requestId,
  })
}

// === Helpers ===

function safeParse(s: string): any {
  try { return JSON.parse(s) } catch { return null }
}

// رنگ و آیکون برای هر نوع نوتیفیکیشن (برای UI)
export function getNotificationStyle(type: NotificationType): {
  color: string
  bgColor: string
  icon: string
} {
  const styles: Record<NotificationType, { color: string; bgColor: string; icon: string }> = {
    NEW_REQUEST: { color: 'text-primary', bgColor: 'bg-primary/10', icon: 'bell' },
    REQUEST_SELECTED: { color: 'text-green-600', bgColor: 'bg-green-50', icon: 'check' },
    REQUEST_EXPIRED: { color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: 'clock' },
    SERVICE_COMPLETED: { color: 'text-green-600', bgColor: 'bg-green-50', icon: 'party' },
    WALLET_LOW: { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: 'wallet' },
    WALLET_TOPUP: { color: 'text-green-600', bgColor: 'bg-green-50', icon: 'wallet' },
    DOCUMENT_VERIFIED: { color: 'text-green-600', bgColor: 'bg-green-50', icon: 'check' },
    DOCUMENT_REJECTED: { color: 'text-red-600', bgColor: 'bg-red-50', icon: 'x' },
    NEW_RATING: { color: 'text-amber-500', bgColor: 'bg-amber-50', icon: 'star' },
    GENERIC: { color: 'text-foreground', bgColor: 'bg-muted', icon: 'bell' },
  }
  return styles[type] || styles.GENERIC
}
