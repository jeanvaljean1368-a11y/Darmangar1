// Test neighborhood-based matching
// 1. Register a provider in تهران/تهران with محله‌های ["ولعصر", "جردن"]
// 2. Create request in تهران/تهران with محله "ولعصر" → provider should be notified
// 3. Create request in تهران/تهران with محله "نارمک" → provider should NOT be notified

import { db } from '../src/lib/db'

const BASE = 'http://127.0.0.1:3000'

async function main() {
  console.log('\n========== TESTING NEIGHBORHOOD MATCHING ==========\n')

  // Register a provider (no referral) in تهران/تهران/NURSING with neighborhoods ["ولعصر", "جردن"]
  console.log('1. Registering provider in تهران/تهران serving محله‌های [ولعصر، جردن]...')
  const fs = await import('fs')
  const logoBuffer = fs.readFileSync('/home/z/my-project/public/darmanegar-logo.png')
  const FormData = (await import('node:buffer')).File
  const logoFile = new FormData([logoBuffer], 'logo.png', { type: 'image/png' })

  const form = new (await import('undici')).FormData()
  form.append('firstName', 'حمید')
  form.append('lastName', 'رضایی')
  form.append('nationalId', '3333333333')
  form.append('username', 'hamid333')
  form.append('password', '123456')
  form.append('serviceType', 'NURSING')
  form.append('province', 'تهران')
  form.append('city', 'تهران')
  form.append('servedNeighborhoods', JSON.stringify(['ولعصر', 'جردن']))
  form.append('profilePhoto', logoFile)
  form.append('doc_NURSING_DEGREE', logoFile)
  form.append('doc_PROFESSIONAL_COMPETENCY', logoFile)
  form.append('doc_NURSING_CARD', logoFile)

  const regRes = await fetch(`${BASE}/api/provider/register`, {
    method: 'POST',
    body: form as any,
  })
  const regData = await regRes.json()
  if (regData.error) {
    console.log('   ❌ Registration error:', regData.error)
    process.exit(1)
  }
  console.log('   ✓ Provider registered:', regData.provider?.firstName, regData.provider?.lastName)

  // Approve via DB update
  await db.provider.update({
    where: { username: 'hamid333' },
    data: { status: 'APPROVED' },
  })
  console.log('   ✓ Provider approved')

  // Test 1: Create request in تهران/تهران/ولعصر → provider SHOULD be notified
  console.log('\n2. Creating request in محله «ولعصر» (provider serves this — should match)...')
  const req1Res = await fetch(`${BASE}/api/request/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'تست محله ۱',
      requesterPhone: '09121111111',
      serviceType: 'NURSING',
      province: 'تهران',
      city: 'تهران',
      neighborhood: 'ولعصر',
      description: 'تست درخواست در محله ولیعصر',
    }),
  })
  const req1Data = await req1Res.json()
  console.log('   ✓ Matching providers count:', req1Data.matchingProvidersCount, '(expected ≥ 1)')
  console.log('   ✓ Message:', req1Data.message)
  if (req1Data.matchingProvidersCount >= 1) {
    console.log('   ✅ تست ۱ موفق! ارائه‌دهنده ولعصر درخواست ولعصر را دریافت کرد.')
  } else {
    console.log('   ❌ تست ۱ ناموفف!')
  }

  // Test 2: Create request in تهران/تهران/نارمک → provider should NOT be notified
  console.log('\n3. Creating request in محله «نارمک» (provider does NOT serve this — should NOT match)...')
  const req2Res = await fetch(`${BASE}/api/request/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'تست محله ۲',
      requesterPhone: '09122222222',
      serviceType: 'NURSING',
      province: 'تهران',
      city: 'تهران',
      neighborhood: 'نارمک',
      description: 'تست درخواست در محله نارمک',
    }),
  })
  const req2Data = await req2Res.json()
  console.log('   ✓ Matching providers count:', req2Data.matchingProvidersCount, '(expected 0)')
  console.log('   ✓ Message:', req2Data.message)
  if (req2Data.matchingProvidersCount === 0) {
    console.log('   ✅ تست ۲ موفق! ارائه‌دهنده ولعصر درخواست نارمک را دریافت نکرد.')
  } else {
    console.log('   ❌ تست ۲ ناموفف!')
  }

  // Test 3: Create request in تبریز/باغمیشه → provider should NOT receive (different city)
  console.log('\n4. Creating request in تبریز/باغمیشه (different city — should NOT match)...')
  const req3Res = await fetch(`${BASE}/api/request/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'تست محله ۳',
      requesterPhone: '09123333333',
      serviceType: 'NURSING',
      province: 'آذربایجان شرقی',
      city: 'تبریز',
      neighborhood: 'باغمیشه',
      description: 'تست درخواست در تبریز باغمیشه',
    }),
  })
  const req3Data = await req3Res.json()
  console.log('   ✓ Matching providers count:', req3Data.matchingProvidersCount, '(expected 0)')
  console.log('   ✓ Message:', req3Data.message)
  if (req3Data.matchingProvidersCount === 0) {
    console.log('   ✅ تست ۳ موفق! ارائه‌دهنده تهران درخواست تبریز را دریافت نکرد.')
  } else {
    console.log('   ❌ تست ۳ ناموفف!')
  }

  // Test 4: Provider dashboard should only show ولعصر request, not نارمک
  console.log('\n5. Login as provider, check active requests in dashboard...')
  const loginRes = await fetch(`${BASE}/api/provider/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hamid333', password: '123456' }),
  })
  const providerCookie = loginRes.headers.get('set-cookie')?.split(';')[0]
  const dashRes = await fetch(`${BASE}/api/provider/requests`, {
    headers: { Cookie: providerCookie || '' },
  })
  const dashData = await dashRes.json()
  console.log('   ✓ Active requests visible to provider:', dashData.activeRequests?.length)
  dashData.activeRequests?.forEach((r: any, i: number) => {
    console.log(`      ${i + 1}. محله: ${r.neighborhood} — ${r.description}`)
  })
  const allValid = dashData.activeRequests?.every((r: any) => r.neighborhood === 'ولعصر' || r.neighborhood === 'جردن')
  if (allValid && dashData.activeRequests?.length > 0) {
    console.log('   ✅ تست ۴ موفق! ارائه‌دهنده فقط درخواست‌های محله‌های خودش را می‌بیند.')
  } else if (dashData.activeRequests?.length === 0) {
    console.log('   ⚠️ هیچ درخواست فعالی برای محله‌های ارائه‌دهنده وجود ندارد')
  } else {
    console.log('   ❌ تست ۴ ناموفف!')
  }

  console.log('\n========== NEIGHBORHOOD MATCHING TESTS COMPLETE ✅ ==========\n')
}

main().catch(e => { console.error('TEST FAILED:', e); process.exit(1) })
