// GET /api/provider/credentials — get credential status + trust score
import { NextRequest } from 'next/server'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/http'
import { getProviderTrustScore, getProviderCredentials, setDefaultExpiryDates } from '@/lib/credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  // Set default expiry dates for documents that don't have one
  await setDefaultExpiryDates(provider.id).catch(() => {})

  const [trustScore, credentials] = await Promise.all([
    getProviderTrustScore(provider.id),
    getProviderCredentials(provider.id),
  ])

  return ok({
    trustScore,
    credentials,
  })
}
