// POST /api/admin/providers/[id]/verify — approve a provider (and verify all docs)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad, notFound } from '@/lib/http'

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

  return ok({ ok: true, message: 'ارائه‌دهنده تأیید شد' })
}
