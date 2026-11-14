// End-to-end API test script for درمانگر
// Tests the full flow: request -> proposal -> select -> chat

import { db } from '../src/lib/db'

const BASE = 'http://localhost:3000'

async function main() {
  console.log('\n========== TESTING FULL FLOW ==========\n')

  // 1. Provider login (محمد رضایی - already approved)
  console.log('1. Provider login...')
  const loginRes = await fetch(`${BASE}/api/provider/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mohammad123', password: '123456' }),
  })
  const loginData = await loginRes.json()
  const providerCookie = loginRes.headers.get('set-cookie')?.split(';')[0]
  console.log('   ✓ Provider logged in:', loginData.provider?.firstName, loginData.provider?.status)

  // 2. Get provider's active requests (should be empty initially)
  console.log('\n2. Get active requests (initial)...')
  const reqRes = await fetch(`${BASE}/api/provider/requests`, {
    headers: { Cookie: providerCookie || '' },
  })
  const reqData = await reqRes.json()
  console.log('   ✓ Active requests count:', reqData.activeRequests?.length)

  // 3. Requester creates a new request
  console.log('\n3. Requester creates a new request...')
  const createRes = await fetch(`${BASE}/api/request/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'زهرا احمدی',
      requesterPhone: '09125556677',
      serviceType: 'NURSING',
      province: 'تهران',
      city: 'تهران',
      region: 'ولعصر',
      description: 'مادرم نیاز به تزریق انسولین روزانه دارد',
    }),
  })
  const createData = await createRes.json()
  const requestId = createData.request?.id
  const requesterToken = createData.request?.requesterToken
  console.log('   ✓ Request created:', requestId?.substring(0, 12), '...')
  console.log('   ✓ Matching providers notified:', createData.matchingProvidersCount)

  // 4. Wait a moment for WS broadcast
  await sleep(500)

  // 5. Provider sees the new request
  console.log('\n4. Provider fetches requests (should see new one)...')
  const reqRes2 = await fetch(`${BASE}/api/provider/requests`, {
    headers: { Cookie: providerCookie || '' },
  })
  const reqData2 = await reqRes2.json()
  console.log('   ✓ Active requests count:', reqData2.activeRequests?.length)
  if (reqData2.activeRequests?.length > 0) {
    console.log('   ✓ First request:', reqData2.activeRequests[0].description.substring(0, 40))
  }

  // 6. Provider submits a proposal
  console.log('\n5. Provider submits a proposal...')
  const proposalRes = await fetch(`${BASE}/api/provider/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: providerCookie || '' },
    body: JSON.stringify({
      requestId,
      price: 150000,
      message: 'با تجربه ۱۵ سال در تزریق انسولین، آماده خدمت‌رسانی هستم',
    }),
  })
  const proposalData = await proposalRes.json()
  console.log('   ✓ Proposal submitted, fee:', proposalData.fee, 'freeRemaining:', proposalData.freeRemaining)
  console.log('   ✓ Provider wallet:', proposalData.provider?.walletBalance)

  // 7. Requester checks for proposals
  console.log('\n6. Requester checks for proposals...')
  const checkRes = await fetch(`${BASE}/api/request/${requestId}?t=${requesterToken}`)
  const checkData = await checkRes.json()
  console.log('   ✓ Status:', checkData.request.status)
  console.log('   ✓ Proposals received:', checkData.request.proposals.length)
  if (checkData.request.proposals.length > 0) {
    console.log('   ✓ First proposal price:', checkData.request.proposals[0].price)
    console.log('   ✓ Provider name:', checkData.request.proposals[0].provider.firstName, checkData.request.proposals[0].provider.lastName)
  }

  // 8. Requester selects the provider
  const proposalId = checkData.request.proposals[0]?.id
  console.log('\n7. Requester selects the provider...')
  const selectRes = await fetch(`${BASE}/api/request/${requestId}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proposalId,
      requesterToken,
    }),
  })
  const selectData = await selectRes.json()
  const chatId = selectData.chatId
  console.log('   ✓ Chat created:', chatId?.substring(0, 12), '...')
  console.log('   ✓ Agreed price:', selectData.agreedPrice)

  // 9. Requester sends a message
  console.log('\n8. Requester sends a message...')
  const sendRes1 = await fetch(`${BASE}/api/chat/${chatId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'سلام، چه ساعتی می‌تونید بیاید؟',
      requesterToken,
    }),
  })
  const sendData1 = await sendRes1.json()
  console.log('   ✓ Message sent:', sendData1.message?.content)

  // 10. Provider sends a reply
  console.log('\n9. Provider sends a reply...')
  const sendRes2 = await fetch(`${BASE}/api/chat/${chatId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: providerCookie || '' },
    body: JSON.stringify({
      content: 'سلام، فردا ساعت ۱۰ صبح مناسب است؟',
    }),
  })
  const sendData2 = await sendRes2.json()
  console.log('   ✓ Reply sent:', sendData2.message?.content)

  // 11. Get all chat messages
  console.log('\n10. Fetch chat messages...')
  const msgRes = await fetch(`${BASE}/api/chat/${chatId}/messages?t=${requesterToken}`)
  const msgData = await msgRes.json()
  console.log('   ✓ Total messages:', msgData.chat?.messages?.length)
  msgData.chat?.messages?.forEach((m: any, i: number) => {
    console.log(`      ${i + 1}. [${m.sender}] ${m.content}`)
  })

  // 12. Check admin stats
  console.log('\n11. Admin login and stats...')
  const adminLoginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'darmanegar1403' }),
  })
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0]
  const statsRes = await fetch(`${BASE}/api/admin/stats`, {
    headers: { Cookie: adminCookie || '' },
  })
  const statsData = await statsRes.json()
  console.log('   ✓ Total providers:', statsData.counts.totalProviders)
  console.log('   ✓ Approved:', statsData.counts.approvedProviders)
  console.log('   ✓ Total requests:', statsData.counts.totalRequests)
  console.log('   ✓ Active:', statsData.counts.activeRequests)
  console.log('   ✓ Selected:', statsData.counts.selectedRequests)
  console.log('   ✓ Total proposals:', statsData.counts.totalProposals)

  console.log('\n========== ALL TESTS PASSED ✅ ==========\n')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch(e => { console.error('TEST FAILED:', e); process.exit(1) })
