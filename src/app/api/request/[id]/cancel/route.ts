// POST /api/request/[id]/cancel — requester cancels the request
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, notFound } from '@/lib/http'
import { closeRequestBroadcast } from '@/lib/ws-broadcast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const requesterToken = body.requesterToken

    if (!requesterToken) return bad('requesterToken الزامی است')

    const serviceRequest = await db.serviceRequest.findUnique({ where: { id } })
    if (!serviceRequest) return notFound('درخواست یافت نشد')
    if (serviceRequest.requesterToken !== requesterToken) return bad('دسترسی غیرمجاز', 403)
    if (serviceRequest.status === 'SELECTED' || serviceRequest.status === 'COMPLETED') {
      return bad('این درخواست قابل لغو نیست')
    }

    await db.serviceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    const matchKey = `${serviceRequest.province}:${serviceRequest.city}:${serviceRequest.serviceType}`
    closeRequestBroadcast(serviceRequest.id, matchKey, 'CANCELLED')

    return ok({ ok: true, message: 'درخواست لغو شد' })
  } catch (e: any) {
    console.error('Cancel error:', e)
    return bad('خطا در لغو درخواست', 500)
  }
}
