'use client'

import { useViewStore } from '@/stores/useViewStore'
import { Home } from '@/components/darmanegar/Home'
import { RequesterFlow } from '@/components/darmanegar/RequesterFlow'
import { ProviderFlow } from '@/components/darmanegar/ProviderFlow'
import { AdminFlow } from '@/components/darmanegar/AdminFlow'

export default function Page() {
  const view = useViewStore((s) => s.view)

  switch (view) {
    case 'requester-flow':
      return <RequesterFlow />
    case 'provider-flow':
      return <ProviderFlow />
    case 'admin-flow':
      return <AdminFlow />
    case 'home':
    default:
      return <Home />
  }
}
