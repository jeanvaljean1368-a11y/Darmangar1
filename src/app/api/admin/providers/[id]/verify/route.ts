// POST /api/admin/providers/[id]/verify — approve a provider (and verify all docs)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/http'
import { notifyDocumentVerified, createNotification } from '@/lib/notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  const provider = await db.provider.findUnique({ where: { id } })
  if (!provider) return notFound('ارائه‌دهنده یافت نشد')

  // Update status to APPROVED and verify all docs
  await db.provider.update({
    where: { id },
    data: {
      status: 'APPROVED',
      rejectionReason: null,
      documents: {
        updateMany: {
          where: { providerId: id },
          data: { verified: true },
        },
      },
    },
  })

  // Send in-app notification to provider
  await notifyDocumentVerified(id).catch(() => {})

  // Send notification to enable push notifications
  await createNotification({
    providerId: id,
    type: 'GENERIC',
    title: '🔔 اعلان‌های گوشی را فعال کنید',
    message: 'برای دریافت درخواست‌های جدید حتی زمانی که در اپ نیستید، لطفاً اعلان‌های Push را فعال کنید.\nبه تب «اعتبار» بروید و روی «فعال‌سازی اعلان‌های Push» کلیک کنید.',
    actionUrl: '/api/provider/credentials',
  }).catch(() => {})

  return ok({ ok: true, message: 'ارائه‌دهنده تأیید شد' })
}

