// PWA Service Worker registration

'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production' && !window.location.search.includes('sw=1')) {
      // Skip SW in dev unless explicitly requested
      return
    }
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed:', err))
    }
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
