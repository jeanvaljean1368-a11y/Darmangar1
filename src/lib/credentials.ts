// Credentials and trust score system for درمانگر
// محاسبه‌ی امتیاز اعتبار ارائه‌دهنده بر اساس:
// - وضعیت تأیید مدارک
// - تعداد خدمات انجام‌شده
// - میانگین امتیاز
// - قدمت عضویت
// - تاریخ انقضای مدارک

import { db } from './db'
import { DOCUMENT_LABELS } from './constants'
import type { DocumentType } from '@prisma/client'

// مدارک که نیاز به تمدید دوره‌ای دارند
const EXPIRABLE_DOCS: DocumentType[] = [
  'NURSING_CARD',        // کارت نظام پرستاری — سالانه
  'PROFESSIONAL_COMPETENCY', // صلاحیت حرفه‌ای — دوره‌ای
]

// مدارک دائمی (بدون تاریخ انقضا)
const PERMANENT_DOCS: DocumentType[] = [
  'NURSING_DEGREE',   // مدرک تحصیلی
  'CAREGIVER_CERT',   // مدرک کمک‌پرستاری
  'WOUND_CERT',       // مدرک زخم
  'MASSAGE_CERT',     // مدرک ماساژ
  'PHYSIO_CERT',      // مدرک فیزیوتراپی
]

export interface CredentialStatus {
  type: DocumentType
  label: string
  fileName: string
  fileUrl: string
  verified: boolean
  hasExpiry: boolean
  expiresAt: Date | null
  daysUntilExpiry: number | null // null = دائمی یا نامشخص
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_UPLOADED' | 'PENDING_VERIFICATION'
  statusLabel: string
  statusColor: string
}

export interface TrustScore {
  score: number // 0-100
  level: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  levelLabel: string
  levelColor: string
  levelIcon: string
  breakdown: {
    documentsVerified: number // 0-30
    servicesCompleted: number // 0-20
    averageRating: number // 0-30
    membershipDuration: number // 0-10
    credentialsCurrent: number // 0-10 (مدارک منقضی‌نشده)
  }
  totalServices: number
  averageRating: number
  totalRatings: number
  memberSince: Date
}

// محاسبه‌ی امتیاز اعتبار
export async function getProviderTrustScore(providerId: string): Promise<TrustScore> {
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      servicesCompleted: true,
      createdAt: true,
      status: true,
      documents: {
        select: {
          id: true,
          type: true,
          verified: true,
          expiresAt: true,
        },
      },
      ratingsReceived: {
        select: { stars: true },
      },
    },
  })

  if (!provider) {
    return {
      score: 0,
      level: 'NEW',
      levelLabel: 'جدید',
      levelColor: 'text-muted-foreground',
      levelIcon: '🆕',
      breakdown: {
        documentsVerified: 0,
        servicesCompleted: 0,
        averageRating: 0,
        membershipDuration: 0,
        credentialsCurrent: 0,
      },
      totalServices: 0,
      averageRating: 0,
      totalRatings: 0,
      memberSince: new Date(),
    }
  }

  // 1. Documents verified (0-30)
  const verifiedDocs = provider.documents.filter((d) => d.verified).length
  const totalDocs = provider.documents.length
  const documentsVerifiedScore = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 30) : 0

  // 2. Services completed (0-20)
  const servicesCompletedScore = Math.min(provider.servicesCompleted, 20)

  // 3. Average rating (0-30)
  const ratings = provider.ratingsReceived
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : 0
  const averageRatingScore = Math.round((avgRating / 5) * 30)

  // 4. Membership duration (0-10) — 1 point per month, up to 10
  const monthsSinceJoin = Math.floor((Date.now() - provider.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
  const membershipDurationScore = Math.min(monthsSinceJoin, 10)

  // 5. Credentials current (0-10) — مدارک منقضی‌نشده
  const now = new Date()
  const expirableDocs = provider.documents.filter((d) => EXPIRABLE_DOCS.includes(d.type))
  const validExpirableDocs = expirableDocs.filter((d) => !d.expiresAt || d.expiresAt > now)
  const credentialsCurrentScore = expirableDocs.length > 0
    ? Math.round((validExpirableDocs.length / expirableDocs.length) * 10)
    : 10 // اگه مدرک قابل‌تمدید نداره، امتیاز کامل

  const totalScore = documentsVerifiedScore + servicesCompletedScore + averageRatingScore + membershipDurationScore + credentialsCurrentScore

  // Determine level
  let level: TrustScore['level'] = 'NEW'
  if (totalScore >= 85) level = 'PLATINUM'
  else if (totalScore >= 70) level = 'GOLD'
  else if (totalScore >= 50) level = 'SILVER'
  else if (totalScore >= 30) level = 'BRONZE'

  const levelInfo: Record<TrustScore['level'], { label: string; color: string; icon: string }> = {
    NEW: { label: 'جدید', color: 'text-muted-foreground', icon: '🆕' },
    BRONZE: { label: 'برنزی', color: 'text-orange-600', icon: '🥉' },
    SILVER: { label: 'نقره‌ای', color: 'text-gray-500', icon: '🥈' },
    GOLD: { label: 'طلایی', color: 'text-amber-500', icon: '🥇' },
    PLATINUM: { label: 'پلاتینیوم', color: 'text-cyan-600', icon: '💎' },
  }

  return {
    score: totalScore,
    level,
    levelLabel: levelInfo[level].label,
    levelColor: levelInfo[level].color,
    levelIcon: levelInfo[level].icon,
    breakdown: {
      documentsVerified: documentsVerifiedScore,
      servicesCompleted: servicesCompletedScore,
      averageRating: averageRatingScore,
      membershipDuration: membershipDurationScore,
      credentialsCurrent: credentialsCurrentScore,
    },
    totalServices: provider.servicesCompleted,
    averageRating: Math.round(avgRating * 10) / 10,
    totalRatings: ratings.length,
    memberSince: provider.createdAt,
  }
}

// دریافت وضعیت مدارک ارائه‌دهنده
export async function getProviderCredentials(providerId: string, serviceType?: string): Promise<CredentialStatus[]> {
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: {
      serviceType: true,
      documents: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!provider) return []

  // مدارک لازم برای این ارائه‌دهنده
  const { REQUIRED_DOCUMENTS } = await import('./constants')
  const requiredDocs = REQUIRED_DOCUMENTS[provider.serviceType] || []

  const now = new Date()
  const result: CredentialStatus[] = []

  for (const docType of requiredDocs) {
    // آخرین مدرک آپلودشده برای این نوع
    const doc = provider.documents.find((d) => d.type === docType)

    if (!doc) {
      result.push({
        type: docType,
        label: DOCUMENT_LABELS[docType],
        fileName: '',
        fileUrl: '',
        verified: false,
        hasExpiry: EXPIRABLE_DOCS.includes(docType),
        expiresAt: null,
        daysUntilExpiry: null,
        status: 'NOT_UPLOADED',
        statusLabel: 'آپلود نشده',
        statusColor: 'text-red-600 bg-red-50 border-red-200',
      })
      continue
    }

    const hasExpiry = EXPIRABLE_DOCS.includes(docType)
    const expiresAt = doc.expiresAt
    let daysUntilExpiry: number | null = null
    let status: CredentialStatus['status'] = 'VALID'
    let statusLabel = 'معتبر'
    let statusColor = 'text-green-600 bg-green-50 border-green-200'

    if (!doc.verified) {
      status = 'PENDING_VERIFICATION'
      statusLabel = 'در انتظار تأیید'
      statusColor = 'text-amber-600 bg-amber-50 border-amber-200'
    } else if (hasExpiry && expiresAt) {
      const diffMs = expiresAt.getTime() - now.getTime()
      daysUntilExpiry = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

      if (daysUntilExpiry < 0) {
        status = 'EXPIRED'
        statusLabel = 'منقضی شده'
        statusColor = 'text-red-600 bg-red-50 border-red-200'
      } else if (daysUntilExpiry <= 30) {
        status = 'EXPIRING_SOON'
        statusLabel = `انقضا نزدیک (${daysUntilExpiry.toLocaleString('fa-IR')} روز)`
        statusColor = 'text-orange-600 bg-orange-50 border-orange-200'
      }
    }

    result.push({
      type: docType,
      label: DOCUMENT_LABELS[docType],
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      verified: doc.verified,
      hasExpiry,
      expiresAt,
      daysUntilExpiry,
      status,
      statusLabel,
      statusColor,
    })
  }

  return result
}

// تنظیم تاریخ انقضا برای مدارک موجود (در صورت تنظیم نشدن، یک سال پیش‌فرض)
export async function setDefaultExpiryDates(providerId: string): Promise<void> {
  const docs = await db.providerDocument.findMany({
    where: { providerId, expiresAt: null },
  })

  for (const doc of docs) {
    if (EXPIRABLE_DOCS.includes(doc.type)) {
      // یک سال از تاریخ آپلود
      const expiry = new Date(doc.createdAt)
      expiry.setFullYear(expiry.getFullYear() + 1)
      await db.providerDocument.update({
        where: { id: doc.id },
        data: { expiresAt: expiry },
      })
    }
  }
}

// آیا ارائه‌دهنده مدارک منقضی‌شده دارد؟
export async function hasExpiredDocuments(providerId: string): Promise<boolean> {
  const now = new Date()
  const count = await db.providerDocument.count({
    where: {
      providerId,
      expiresAt: { lt: now },
    },
  })
  return count > 0
}
