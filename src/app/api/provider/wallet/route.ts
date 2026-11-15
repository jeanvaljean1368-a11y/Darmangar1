// GET /api/provider/wallet — get wallet balance + transactions
import { NextRequest } from 'next/server'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'
import { getProviderWallet } from '@/lib/payment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  const wallet = await getProviderWallet(provider.id)
  if (!wallet) return unauthorized()

  return ok({ wallet })
}
