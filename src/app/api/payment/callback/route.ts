// GET /api/payment/callback — payment gateway callback (Zarinpal/IdPay)
import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/payment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pid = url.searchParams.get('pid') || ''
  // Zarinpal params
  const authority = url.searchParams.get('Authority') || url.searchParams.get('authority') || ''
  const status = url.searchParams.get('Status') || url.searchParams.get('status') || ''
  // IdPay params
  const trackId = url.searchParams.get('track_id') || ''
  const id = url.searchParams.get('id') || ''

  if (!pid) {
    return NextResponse.redirect(new URL('/?payment=error&reason=nopid', request.url))
  }

  const result = await verifyPayment(pid, authority || trackId || id, status || 'OK')

  if (result.ok) {
    return NextResponse.redirect(new URL(`/?payment=success&pid=${pid}`, request.url))
  } else {
    return NextResponse.redirect(new URL(`/?payment=failed&pid=${pid}&reason=${encodeURIComponent(result.error || '')}`, request.url))
  }
}
