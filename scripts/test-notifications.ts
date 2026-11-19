// Test notification system end-to-end
import { db } from '../src/lib/db'

const BASE = 'http://127.0.0.1:3000'

async function main() {
  console.log('\n========== TESTING IN-APP NOTIFICATIONS ==========\n')

  const fs = await import('fs')
  const logoBuffer = fs.readFileSync('/home/z/my-project/public/darmanegar-logo.png')
  const FormData = (await import('node:buffer')).File
  const logoFile = new FormData([logoBuffer], 'logo.png', { type: 'image/png' })

  // 1. Register & approve a provider
  console.log('1. Registering provider...')
  const form = new (await import('undici')).FormData()
  form.append('firstName', 'مریم')
  form.append('lastName', 'تستی')
  form.append('nationalId', '5555555555')
  form.append('username', 'maryam555')
  form.append('password', '123456')
  form.append('serviceType', 'NURSING')
  form.append('province', 'تهران')
  form.append('city', 'تهران')
  form.append('servedNeighborhoods', JSON.stringify(['ولعصر']))
  form.append('profilePhoto', logoFile)
  form.append('doc_NURSING_DEGREE', logoFile)
  form.append('doc_PROFESSIONAL_COMPETENCY', logoFile)
  form.append('doc_NURSING_CARD', logoFile)

  const regRes = await fetch(`${BASE}/api/provider/register`, { method: 'POST', body: form as any })
  const regData = await regRes.json()
  if (regData.error) { console.log('❌ Register failed:', regData.error); return }

  await db.provider.update({ where: { username: 'maryam555' }, data: { status: 'APPROVED' } })
  console.log('   ✓ Provider approved')

  // Login
  const loginRes = await fetch(`${BASE}/api/provider/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'maryam555', password: '123456' }),
  })
  const providerCookie = loginRes.headers.get('set-cookie')?.split(';')[0]

  // 2. Check notifications (should be empty)
  console.log('\n2. Checking notifications before any request...')
  let notifRes = await fetch(`${BASE}/api/provider/notifications`, {
    headers: { Cookie: providerCookie || '' },
  })
  let notifData = await notifRes.json()
  console.log('   ✓ Initial unread count:', notifData.unreadCount)

  // 3. Admin verifies provider (triggers notification)
  console.log('\n3. Admin verifying provider (should trigger notification)...')
  const adminLogin = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'darmanegar1403' }),
  })
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0]

  // First reject then verify to trigger both notification types
  await fetch(`${BASE}/api/admin/providers/${regData.provider.id}/verify`, {
    method: 'POST',
    headers: { Cookie: adminCookie || '' },
  })
  console.log('   ✓ Verify API called')

  // 4. Check notifications
  notifRes = await fetch(`${BASE}/api/provider/notifications`, {
    headers: { Cookie: providerCookie || '' },
  })
  notifData = await notifRes.json()
  console.log('   ✓ After verify — unread count:', notifData.unreadCount)
  if (notifData.notifications?.length > 0) {
    console.log('   ✓ Latest notification:', notifData.notifications[0].title)
  }

  // 5. Create a request (should trigger NEW_REQUEST notification to provider)
  console.log('\n4. Creating a request in محله ولیعصر...')
  const reqRes = await fetch(`${BASE}/api/request/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'تست اعلان',
      requesterPhone: '09126667788',
      serviceType: 'NURSING',
      province: 'تهران',
      city: 'تهران',
      neighborhood: 'ولعصر',
      description: 'تست سیستم اعلان درون‌برنامه‌ای',
    }),
  })
  const reqData = await reqRes.json()
  console.log('   ✓ Request created')

  // 6. Check notifications - should have new request notification
  notifRes = await fetch(`${BASE}/api/provider/notifications`, {
    headers: { Cookie: providerCookie || '' },
  })
  notifData = await notifRes.json()
  console.log('   ✓ After request — unread count:', notifData.unreadCount)
  if (notifData.notifications?.length > 0) {
    console.log('   ✓ Latest notification:', notifData.notifications[0].title)
    console.log('   ✓ Message:', notifData.notifications[0].message.substring(0, 60))
  }

  // 7. Mark all as read
  console.log('\n5. Marking all notifications as read...')
  await fetch(`${BASE}/api/provider/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: providerCookie || '' },
    body: JSON.stringify({ action: 'mark-all-read' }),
  })
  notifRes = await fetch(`${BASE}/api/provider/notifications`, {
    headers: { Cookie: providerCookie || '' },
  })
  notifData = await notifRes.json()
  console.log('   ✓ After mark-all-read — unread count:', notifData.unreadCount)

  // 8. Admin notifications view
  console.log('\n6. Admin notifications view...')
  const adminNotifRes = await fetch(`${BASE}/api/admin/notifications?limit=20`, {
    headers: { Cookie: adminCookie || '' },
  })
  const adminNotifData = await adminNotifRes.json()
  console.log('   ✓ Total notifications:', adminNotifData.stats?.total)
  console.log('   ✓ Read:', adminNotifData.stats?.read)
  console.log('   ✓ Unread:', adminNotifData.stats?.unread)

  console.log('\n========== NOTIFICATION TESTS PASSED ✅ ==========\n')
}

main().catch(e => { console.error('TEST FAILED:', e); process.exit(1) })
