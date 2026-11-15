// Payment gateway integration for درمانگر
// Supports Zarinpal (and IdPay as alternative), with a mock mode for development.
// Configure via environment variables:
//   PAYMENT_PROVIDER=zarinpal|idpay|mock  (default: mock)
//   ZARINPAL_MERCHANT_ID=...
//   IDPAY_API_KEY=...
//   PAYMENT_CALLBACK_URL=https://yourdomain.com/api/payment/callback

import { db } from './db'

export type PaymentProvider = 'zarinpal' | 'idpay' | 'mock'

export interface PaymentConfig {
  provider: PaymentProvider
  merchantId?: string
  apiKey?: string
  callbackUrl: string
}

let cachedConfig: PaymentConfig | null = null

export function getPaymentConfig(): PaymentConfig {
  if (cachedConfig) return cachedConfig
  const provider = (process.env.PAYMENT_PROVIDER as PaymentProvider) || 'mock'
  cachedConfig = {
    provider,
    merchantId: process.env.ZARINPAL_MERCHANT_ID,
    apiKey: process.env.IDPAY_API_KEY,
    callbackUrl: process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000/api/payment/callback',
  }
  return cachedConfig
}

export interface CreatePaymentResult {
  ok: boolean
  paymentId: string // our internal payment ID
  authority?: string // gateway authority/code
  redirectUrl?: string // URL to redirect user for payment
  error?: string
}

export interface VerifyPaymentResult {
  ok: boolean
  status: 'COMPLETED' | 'FAILED'
  trackingCode?: string
  refId?: string
  error?: string
}

// Create a new payment request (returns redirect URL for user)
export async function createPayment(params: {
  providerId: string
  amount: number // in Toman
  description: string
  type: 'WALLET_TOPUP' | 'PROPOSAL_FEE' | 'SERVICE_PAYMENT'
  proposalId?: string
}): Promise<CreatePaymentResult> {
  const config = getPaymentConfig()
  if (params.amount < 1000) {
    return { ok: false, paymentId: '', error: 'مبلغ باید حداقل ۱,۰۰۰ تومان باشد' }
  }

  // Create pending payment record
  const payment = await db.payment.create({
    data: {
      providerId: params.providerId,
      amount: params.amount,
      type: params.type,
      proposalId: params.proposalId,
      description: params.description,
      gateway: config.provider,
      status: 'PENDING',
    },
  })

  try {
    if (config.provider === 'mock' || !config.merchantId) {
      // Mock mode — auto-approve immediately
      console.log(`[PAYMENT MOCK] Payment ${payment.id} for ${params.amount} Toman (auto-approved)`)
      // Auto-complete the payment
      await completeMockPayment(payment.id)
      return {
        ok: true,
        paymentId: payment.id,
        authority: `mock_${payment.id}`,
        redirectUrl: `/api/payment/mock-success?pid=${payment.id}`,
      }
    } else if (config.provider === 'zarinpal') {
      return await createZarinpalPayment(payment.id, params.amount, params.description, config)
    } else if (config.provider === 'idpay') {
      return await createIdpayPayment(payment.id, params.amount, params.description, config)
    } else {
      return { ok: false, paymentId: payment.id, error: 'پیکربندی پرداخت نامعتبر است' }
    }
  } catch (e: any) {
    // Mark payment as failed
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    })
    return { ok: false, paymentId: payment.id, error: e.message || 'خطای نامشخص' }
  }
}

// === Zarinpal ===
async function createZarinpalPayment(paymentId: string, amount: number, description: string, config: PaymentConfig): Promise<CreatePaymentResult> {
  const url = 'https://api.zarinpal.com/pg/v4/payment/request.json'
  // Note: Zarinpal expects amount in Toman
  const body = {
    merchant_id: config.merchantId,
    amount,
    description,
    callback_url: `${config.callbackUrl}?pid=${paymentId}`,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.data?.authority) {
    const authority = data.data.authority
    // Save authority to payment record
    await db.payment.update({
      where: { id: paymentId },
      data: { trackingCode: authority },
    })
    return {
      ok: true,
      paymentId,
      authority,
      redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}`,
    }
  }
  return { ok: false, paymentId, error: data?.errors?.message || 'خطای زرین‌پال' }
}

// === IdPay ===
async function createIdpayPayment(paymentId: string, amount: number, description: string, config: PaymentConfig): Promise<CreatePaymentResult> {
  const url = 'https://api.idpay.ir/v1.4/payment'
  const body = {
    order_id: paymentId,
    amount: amount * 10, // IdPay expects Rial
    name: '',
    phone: '',
    desc: description,
    callback: `${config.callbackUrl}?pid=${paymentId}`,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.apiKey || '',
      'X-SANDBOX': '0',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.id) {
    await db.payment.update({
      where: { id: paymentId },
      data: { trackingCode: data.id },
    })
    return {
      ok: true,
      paymentId,
      authority: data.id,
      redirectUrl: `https://idpay.ir/p/${data.id}`,
    }
  }
  return { ok: false, paymentId, error: data?.error_message || 'خطای آیدی‌پی' }
}

// Verify payment after callback
export async function verifyPayment(paymentId: string, authority: string, status: string): Promise<VerifyPaymentResult> {
  const config = getPaymentConfig()
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) {
    return { ok: false, status: 'FAILED', error: 'پرداخت یافت نشد' }
  }
  if (payment.status === 'COMPLETED') {
    return { ok: true, status: 'COMPLETED', trackingCode: payment.trackingCode || '' }
  }
  if (status !== 'OK' && status !== '200') {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return { ok: false, status: 'FAILED', error: 'پرداخت توسط کاربر لغو شد' }
  }

  try {
    let verifyResult: { trackingCode?: string; refId?: string } = {}
    if (config.provider === 'mock' || !config.merchantId) {
      verifyResult = { trackingCode: `mock_${payment.id}`, refId: payment.id }
    } else if (config.provider === 'zarinpal') {
      verifyResult = await verifyZarinpal(payment.amount, authority, config)
    } else if (config.provider === 'idpay') {
      verifyResult = await verifyIdpay(payment.id, payment.amount, authority, config)
    }

    // Mark as completed
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        trackingCode: verifyResult.trackingCode || authority,
      },
    })

    // Apply payment effect (wallet top-up, etc.)
    await applyPaymentEffect(payment)

    return { ok: true, status: 'COMPLETED', ...verifyResult }
  } catch (e: any) {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return { ok: false, status: 'FAILED', error: e.message }
  }
}

async function verifyZarinpal(amount: number, authority: string, config: PaymentConfig) {
  const url = 'https://api.zarinpal.com/pg/v4/payment/verify.json'
  const body = { merchant_id: config.merchantId, amount, authority }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.data?.ref_id) {
    return { trackingCode: String(data.data.ref_id), refId: String(data.data.ref_id) }
  }
  throw new Error(data?.errors?.message || 'تأیید پرداخت ناموفق')
}

async function verifyIdpay(id: string, amountToman: number, trackId: string, config: PaymentConfig) {
  const url = 'https://api.idpay.ir/v1.4/payment/verify'
  const body = { id, order_id: id }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.apiKey || '',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data?.status === 200) {
    return { trackingCode: String(data.track_id), refId: String(data.track_id) }
  }
  throw new Error(data?.error_message || 'تأیید پرداخت ناموفق')
}

// Complete a mock payment (auto-approve)
async function completeMockPayment(paymentId: string) {
  const payment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      trackingCode: `mock_${paymentId}`,
    },
  })
  await applyPaymentEffect(payment)
}

// Apply the effect of a completed payment (add to wallet, etc.)
async function applyPaymentEffect(payment: { id: string; providerId: string; amount: number; type: string; description: string | null }) {
  const provider = await db.provider.findUnique({
    where: { id: payment.providerId },
    select: { walletBalance: true },
  })
  if (!provider) return

  let newBalance = provider.walletBalance
  if (payment.type === 'WALLET_TOPUP') {
    newBalance += payment.amount
  } else if (payment.type === 'PROPOSAL_FEE') {
    // Already deducted at submission; this is a topup to cover negative balance
    newBalance += payment.amount
  } else if (payment.type === 'SERVICE_PAYMENT') {
    // Payment for a service — add to wallet (provider will withdraw later)
    newBalance += payment.amount
  }

  await db.provider.update({
    where: { id: payment.providerId },
    data: {
      walletBalance: newBalance,
      totalPaid: payment.type === 'WALLET_TOPUP' ? { increment: payment.amount } : undefined,
    },
  })

  // Record wallet transaction
  await db.walletTransaction.create({
    data: {
      providerId: payment.providerId,
      amount: payment.amount,
      type: payment.type === 'WALLET_TOPUP' ? 'TOPUP' : (payment.type === 'SERVICE_PAYMENT' ? 'SERVICE_PAYMENT' : 'PROPOSAL_FEE'),
      balance: newBalance,
      description: payment.description || payment.type,
      paymentId: payment.id,
    },
  })
}

// Get provider wallet balance and recent transactions
export async function getProviderWallet(providerId: string) {
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { walletBalance: true, totalPaid: true, totalEarnings: true },
  })
  if (!provider) return null
  const transactions = await db.walletTransaction.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return {
    balance: provider.walletBalance,
    totalPaid: provider.totalPaid,
    totalEarnings: provider.totalEarnings,
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      balance: t.balance,
      description: t.description,
      createdAt: t.createdAt,
    })),
  }
}
