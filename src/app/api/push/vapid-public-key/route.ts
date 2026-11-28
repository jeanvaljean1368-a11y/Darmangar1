// GET /api/push/vapid-public-key — returns VAPID public key for client
// مستقل از web-push library — همیشه کار می‌کنه
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDCozsZVmmwKbKwk459KaAkb9c6-kVroHFuJDkt0suMAMJCsXs9VwIEBIdrn9skj0AIOi0apDlQ5t1JQM7N3Brs'

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY })
}
