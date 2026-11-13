// Quick DB check script
import { db } from '../src/lib/db'

async function main() {
  const providers = await db.provider.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      province: true,
      city: true,
      serviceType: true,
      freeProposalCount: true,
      proposalsSubmitted: true,
      referralCode: true,
    },
  })
  console.log('=== PROVIDERS ===')
  console.log(JSON.stringify(providers, null, 2))

  const requests = await db.serviceRequest.findMany({
    select: {
      id: true,
      requesterName: true,
      serviceType: true,
      province: true,
      city: true,
      status: true,
      createdAt: true,
    },
  })
  console.log('\n=== REQUESTS ===')
  console.log(JSON.stringify(requests, null, 2))

  const adminCount = await db.admin.count()
  console.log('\n=== ADMIN COUNT ===', adminCount)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
