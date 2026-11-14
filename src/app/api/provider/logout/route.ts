// POST /api/provider/logout
import { NextResponse } from 'next/server'
import { clearCookieHeader } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', clearCookieHeader('provider-token'))
  return res
}
