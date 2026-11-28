// Auto Push Notification setup — فعال‌سازی خودکار هنگام ورود

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'

export function AutoPushSetup({ providerId }: { providerId: string }) {
  const [status, setStatus] = useState<'checking' | 'prompting' | 'active' | 'denied' | 'unsupported'>('checking')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (providerId === 'pending') return // wait for real ID

    // Check support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    let cancelled = false

    async function setup() {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        if (cancelled) return

        // Check if already subscribed
        const existingSub = await registration.pushManager.getSubscription()
        if (existingSub) {
          setStatus('active')
          return
        }

        if (cancelled) return

        // Check current permission
        if (Notification.permission === 'granted') {
          // Permission already granted but not subscribed — subscribe now
          await subscribe(registration)
        } else if (Notification.permission === 'default') {
          // Request permission automatically
          setStatus('prompting')
          const perm = await Notification.requestPermission()
          if (cancelled) return

          if (perm === 'granted') {
            await subscribe(registration)
          } else {
            setStatus('denied')
          }
        } else {
          // Permission denied
          setStatus('denied')
        }
      } catch (e) {
        console.error('Auto push setup error:', e)
      }
    }

    async function subscribe(registration: ServiceWorkerRegistration) {
      try {
        // Get VAPID key
        const res = await fetch('/api/push/vapid-public-key')
        const data = await res.json()
        if (!data.publicKey) return

        const key = urlBase64ToUint8Array(data.publicKey)
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        })

        // Save to server
        const subJSON = subscription.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subJSON.endpoint,
            keys: subJSON.keys,
          }),
        })

        if (!cancelled) {
          setStatus('active')
          toast.success('🔔 اعلان‌های درمانگر فعال شد — درخواست‌های جدید رو با صدا و ویبره دریافت می‌کنید')
        }
      } catch (e) {
        console.error('Subscribe error:', e)
      }
    }

    // Delay 2 seconds after login to not interrupt the UI
    const timer = setTimeout(setup, 2000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [providerId])

  // Show a small indicator
  if (status === 'active') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <Bell className="w-3 h-3" />
          اعلان‌ها فعال است
        </div>
      </div>
    )
  }

  return null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
