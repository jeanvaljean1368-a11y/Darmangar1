// Push Notification Manager — فعال/غیرفعال‌سازی اعلان‌های Push

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function PushNotificationManager({ providerId }: { providerId: string }) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    setSupported(true)
    setPermission(Notification.permission)

    // Register service worker if not already
    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      setSwReady(true)
      // Check if already subscribed
      const existingSub = await registration.pushManager.getSubscription()
      if (existingSub) {
        setSubscribed(true)
      }
    }).catch((err) => {
      console.error('SW registration failed:', err)
    })
  }, [])

  const handleSubscribe = async () => {
    if (!swReady) {
      toast.error('سرویس Worker هنوز آماده نیست. لطفاً صبر کنید.')
      return
    }

    setLoading(true)
    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        toast.error('اجازه‌ی اعلان داده نشد. لطفاً در تنظیمات مرورگر اجازه بدهید.')
        setLoading(false)
        return
      }

      // Get VAPID public key
      const res = await fetch('/api/push/vapid-public-key')
      const data = await res.json()
      const publicKey = data.publicKey

      if (!publicKey) {
        toast.error('کلید VAPID یافت نشد')
        setLoading(false)
        return
      }

      // Convert VAPID key
      const convertedKey = urlBase64ToUint8Array(publicKey)

      // Subscribe
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      // Send subscription to server
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

      setSubscribed(true)
      toast.success('اعلان‌های Push فعال شد! از این به بعد درخواست‌های جدید رو روی صفحه می‌بینی.')
    } catch (e: any) {
      console.error('Push subscribe error:', e)
      toast.error('خطا در فعال‌سازی اعلان: ' + (e.message || 'نامشخص'))
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setSubscribed(false)
      toast.info('اعلان‌های Push غیرفعال شد')
    } catch (e) {
      toast.error('خطا در غیرفعال‌سازی')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="text-sm text-muted-foreground">
            مرورگر شما از اعلان‌های Push پشتیبانی نمی‌کند. لطفاً از Chrome یا Firefox استفاده کنید.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-primary/20 ${subscribed ? 'bg-green-50/30' : ''}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {subscribed ? (
            <><Bell className="w-4 h-4 text-green-600" /> اعلان‌های Push فعال است</>
          ) : (
            <><BellOff className="w-4 h-4 text-muted-foreground" /> اعلان‌های Push</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          {subscribed
            ? '✅ وقتی درخواست جدیدی برای شما ارسال می‌شود، حتی اگر اپ باز نباشد، یک اعلان روی صفحه‌ی موبایل شما نمایش داده می‌شود.'
            : 'با فعال‌سازی این قابلیت، وقتی درخواست جدیدی منطبق با تخصص و محله‌ی شما ثبت شود، یک اعلان روی صفحه‌ی موبایل/مرورگر شما نمایش داده می‌شود — حتی اگر اپ باز نباشد.'}
        </div>

        {permission === 'denied' && !subscribed && (
          <div className="text-xs text-red-600 bg-red-50 rounded p-2">
            ⚠️ شما اجازه‌ی اعلان را رد کرده‌اید. برای فعال‌سازی، در تنظیمات مرورگر → Site Settings → Notifications → Allow را انتخاب کنید.
          </div>
        )}

        {subscribed ? (
          <Button
            onClick={handleUnsubscribe}
            disabled={loading}
            variant="outline"
            className="w-full text-red-600 border-red-200"
          >
            {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <BellOff className="w-4 h-4 ml-2" />}
            غیرفعال‌سازی اعلان‌ها
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={loading || permission === 'denied'}
            className="w-full bg-teal-gradient"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال فعال‌سازی...</>
            ) : (
              <><Bell className="w-4 h-4 ml-2" /> فعال‌سازی اعلان‌های Push</>
            )}
          </Button>
        )}

        {subscribed && (
          <div className="text-xs flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            اعلان‌ها فعال هستند. می‌توانید با کلیک روی اعلان، مستقیماً وارد اپ شوید.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Convert base64 URL to Uint8Array for VAPID key
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
