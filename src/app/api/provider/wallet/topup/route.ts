// POST /api/provider/wallet/topup
// Create a payment request for wallet top-up
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import { createPayment } from '@/lib/payment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const body = await request.json()
    const amount = Number(body.amount)
    if (!amount || amount < 1000) return bad('مبلغ باید حداقل ۱,۰۰۰ تومان باشد')
    if (amount > 10_000_000) return bad('مبلغ نباید بیشتر از ۱۰,۰۰۰,۰۰۰ تومان باشد')

    const result = await createPayment({
      providerId: provider.id,
      amount,
      description: `شارژ کیف پول - ${amount.toLocaleString('fa-IR')} تومان`,
      type: 'WALLET_TOPUP',
    })

    if (!result.ok) return bad(result.error || 'خطا در ایجاد درخواست پرداخت')

    return ok({
      ok: true,
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
      authority: result.authority,
    })
  } catch (e: any) {
    return bad('خطا در پرداخت', 500)
  }
}
