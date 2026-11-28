// GET /api/push/vapid-public-key — returns VAPID public key for client
import { NextRequest } from 'next/server'
import { ok } from '@/lib/http'
import { getVapidPublicKey } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return ok({ publicKey: getVapidPublicKey() })
}
