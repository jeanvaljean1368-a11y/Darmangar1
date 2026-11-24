// POST /api/provider/credentials/renew — renew an expired/expiring document
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'
import { saveFile, validateFile } from '@/lib/upload'
import type { DocumentType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const formData = await request.formData()
    const documentType = formData.get('documentType') as DocumentType
    const expiryMonthsStr = formData.get('expiryMonths') as string
    const file = formData.get('file') as File | null

    if (!documentType) return bad('نوع مدرک الزامی است')
    if (!file || file.size === 0) return bad('فایل مدرک الزامی است')

    const check = validateFile(file)
    if (!check.ok) return bad(check.error!)

    // Find the old document
    const oldDoc = await db.providerDocument.findFirst({
      where: { providerId: provider.id, type: documentType },
      orderBy: { createdAt: 'desc' },
    })

    if (!oldDoc) {
      return notFound('مدرک قبلی یافت نشد')
    }

    // Save new file
    const saved = await saveFile(file, 'documents')

    // Calculate expiry date
    const expiryMonths = expiryMonthsStr ? parseInt(expiryMonthsStr, 10) : 12
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths)

    // Create new document, mark old one as superseded
    const newDoc = await db.providerDocument.create({
      data: {
        providerId: provider.id,
        type: documentType,
        fileUrl: saved.url,
        fileName: file.name,
        verified: false, // نیاز به تأیید مجدد مدیر
        expiresAt,
        renewedFrom: oldDoc.id,
      },
    })

    // Update old document — set expiry to now (it's been replaced)
    await db.providerDocument.update({
      where: { id: oldDoc.id },
      data: { expiresAt: new Date() },
    })

    // Send notification to admin (via system — they'll see it in pending docs)
    // The admin will see the new document with verified=false

    return ok({
      ok: true,
      document: {
        id: newDoc.id,
        type: newDoc.type,
        fileName: newDoc.fileName,
        fileUrl: newDoc.fileUrl,
        expiresAt: newDoc.expiresAt,
        verified: newDoc.verified,
      },
      message: 'مدرک جدید آپلود شد. پس از تأیید مدیر، اعتبار شما به‌روزرسانی خواهد شد.',
    })
  } catch (e: any) {
    console.error('Credential renew error:', e)
    return bad(`خطا در تمدید مدرک: ${e.message || 'نامشخص'}`, 500)
  }
}
