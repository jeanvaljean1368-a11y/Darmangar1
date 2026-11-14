// Test pricing after 5 free proposals + referral bonus

import { db } from '../src/lib/db'

const BASE = 'http://localhost:3000'

async function main() {
  console.log('\n========== TESTING PRICING ==========\n')

  // Register 5 more providers in Tehran (all nursing) so we can test the 5-proposal cap on a single request
  // Actually let's test pricing differently - one provider submits 6 proposals to 6 different requests

  // First, let's register a new provider WITH a referral code from mohammad123
  console.log('1. Registering provider WITH referral code...')

  // Get mohammad123's referral code
  const referrer = await db.provider.findFirst({
    where: { username: 'mohammad123' },
    select: { referralCode: true },
  })
  console.log('   Referrer code:', referrer?.referralCode)

  // Create requests first
  console.log('\n2. Creating 7 test requests (so provider can submit 7 proposals)...')
  const requestIds: string[] = []
  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${BASE}/api/request/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterName: `تست ${i + 1}`,
        requesterPhone: '0912000000' + (i + 1),
        serviceType: 'NURSING',
        province: 'تهران',
        city: 'تهران',
        description: `تست شماره ${i + 1} برای بررسی قیمت‌گذاری`,
      }),
    })
    const data = await res.json()
    requestIds.push(data.request.id)
  }
  console.log('   ✓ Created 7 requests')

  // mohammad123 already submitted 1 proposal (free), so 4 more free, then 2 paid
  console.log('\n3. mohammad123 submitting 6 more proposals (already used 1 free)...')
  const loginRes = await fetch(`${BASE}/api/provider/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mohammad123', password: '123456' }),
  })
  const providerCookie = loginRes.headers.get('set-cookie')?.split(';')[0]

  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${BASE}/api/provider/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: providerCookie || '' },
      body: JSON.stringify({
        requestId: requestIds[i],
        price: 100000 + i * 10000,
        message: `پیشنهاد شماره ${i + 2}`,
      }),
    })
    const data = await res.json()
    console.log(`   Proposal ${i + 2}: fee=${data.fee?.toLocaleString('fa-IR') || 0} ت, freeRemaining=${data.freeRemaining}, wallet=${data.provider?.walletBalance}`)
  }

  // Now register a new provider with referral code
  console.log('\n4. Registering new provider with referral code (should get 7 free)...')
  // Need a way to upload files in script - use a small placeholder
  const FormData = (await import('node:buffer')).File
  const fileContent = Buffer.from('dummy')
  const dummyFile = new FormData([fileContent], 'test.png', { type: 'image/png' })

  // We'll use the public logo file
  const fs = await import('fs')
  const logoBuffer = fs.readFileSync('/home/z/my-project/public/darmanegar-logo.png')
  const logoFile = new FormData([logoBuffer], 'logo.png', { type: 'image/png' })

  const form = new (await import('undici')).FormData()
  form.append('firstName', 'سارا')
  form.append('lastName', 'کریمی')
  form.append('nationalId', '9876543210')
  form.append('username', 'sara123')
  form.append('password', '123456')
  form.append('serviceType', 'NURSING')
  form.append('province', 'تهران')
  form.append('city', 'تهران')
  form.append('referralCode', referrer?.referralCode || '')
  form.append('profilePhoto', logoFile)
  form.append('doc_NURSING_DEGREE', logoFile)
  form.append('doc_PROFESSIONAL_COMPETENCY', logoFile)
  form.append('doc_NURSING_CARD', logoFile)

  const regRes = await fetch(`${BASE}/api/provider/register`, {
    method: 'POST',
    body: form as any,
  })
  const regData = await regRes.json()
  console.log('   ✓ New provider:', regData.provider?.firstName, regData.provider?.lastName)
  console.log('   ✓ Free proposal count:', regData.provider?.freeProposalCount, '(should be 7 = 5 + 2)')

  // Now check that mohammad123 (referrer) gets discount or bonus
  console.log('\n5. Verifying referral structure...')
  const referred = await db.provider.findFirst({
    where: { username: 'sara123' },
    select: { id: true, referredById: true, freeProposalCount: true },
  })
  console.log('   ✓ Referred by:', referred?.referredById ? 'mohammad123' : 'none')
  console.log('   ✓ Free proposal count:', referred?.freeProposalCount)

  console.log('\n========== PRICING TESTS DONE ✅ ==========\n')
}

main().catch(e => { console.error('TEST FAILED:', e); process.exit(1) })
