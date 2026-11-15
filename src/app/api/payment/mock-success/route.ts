// GET /api/payment/mock-success — mock payment success (dev mode)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pid = url.searchParams.get('pid') || ''
  if (!pid) {
    return NextResponse.redirect(new URL('/?payment=error', request.url))
  }

  // For mock: payment is already auto-completed in createPayment
  const payment = await db.payment.findUnique({ where: { id: pid } })
  if (!payment) {
    return NextResponse.redirect(new URL('/?payment=error', request.url))
  }

  return NextResponse.redirect(new URL(`/?payment=success&pid=${pid}&amount=${payment.amount}`, request.url))
}
