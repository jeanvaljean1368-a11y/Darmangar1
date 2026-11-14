// POST /api/provider/login
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, signProviderToken } from '@/lib/auth'
import { ok, bad, setCookieHeader } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) return bad('نام کاربری و رمز عبور الزامی است')

    const provider = await db.provider.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { documents: true },
    })
    if (!provider) return bad('نام کاربری یا رمز عبور اشتباه است')

    const valid = await comparePassword(password, provider.password)
    if (!valid) return bad('نام کاربری یا رمز عبور اشتباه است')

    const token = signProviderToken({
      providerId: provider.id,
      username: provider.username,
      role: 'provider',
    })

    const res = ok({
      ok: true,
      provider: {
        id: provider.id,
        username: provider.username,
        firstName: provider.firstName,
        lastName: provider.lastName,
        serviceType: provider.serviceType,
        status: provider.status,
        rejectionReason: provider.rejectionReason,
        province: provider.province,
        city: provider.city,
        region: provider.region,
        profilePhoto: provider.profilePhoto,
        freeProposalCount: provider.freeProposalCount,
        proposalsSubmitted: provider.proposalsSubmitted,
        walletBalance: provider.walletBalance,
        referralCode: provider.referralCode,
        isWoundSpecialist: provider.isWoundSpecialist,
        documents: provider.documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileUrl: d.fileUrl,
          verified: d.verified,
        })),
      },
    })
    res.headers.set('Set-Cookie', setCookieHeader('provider-token', token, 7))
    return res
  } catch (e: any) {
    console.error('Provider login error:', e)
    return bad('خطا در ورود', 500)
  }
}
