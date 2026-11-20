// WebSocket client utilities for درمانگر app
// On Vercel production: WebSocket is not supported (serverless), uses polling only
// In dev/standalone: connects to local WS service on port 3003

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

// Check if we should use WebSocket
// On Vercel production, WS service is not available — rely on polling
function shouldUseWebSocket(): boolean {
  if (typeof window === 'undefined') return false
  // اگر در محیط production روی Vercel هستیم (هست Vercel)، WS غیرفعال
  // در غیر این صورت (dev یا VPS با WS service) فعال
  // تشخیص: اگر hostname شامل vercel.app یا production domain باشه
  const host = window.location.hostname
  if (host.includes('vercel.app')) return false
  // اگر env var DISABLE_WS ست شده باشه
  if (typeof process !== 'undefined' && process.env?.DISABLE_WS === '1') return false
  // در غیر این صورت: تلاش برای اتصال
  return true
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: shouldUseWebSocket() ? 10 : 0,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: shouldUseWebSocket(),
    })

    // اگر autoConnect غیرفعال، به‌صورت دستی در صورت نیاز connect می‌کنیم
    if (!shouldUseWebSocket()) {
      socket.disconnect()
    }
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function isWebSocketActive(): boolean {
  return shouldUseWebSocket() && socket?.connected === true
}

// Provider joins WebSocket
export function providerJoin(data: {
  providerId: string
  username: string
  province: string
  city: string
  serviceType: string
  servedNeighborhoods?: string[]
}) {
  if (!shouldUseWebSocket()) return Promise.resolve()
  const s = getSocket()
  return new Promise<void>((resolve) => {
    s.emit('provider:join', data)
    s.once('provider:joined', () => resolve())
  })
}

// Requester joins WebSocket
export function requesterJoin(data: { requestId: string; requesterToken: string }) {
  if (!shouldUseWebSocket()) return Promise.resolve()
  const s = getSocket()
  return new Promise<void>((resolve) => {
    s.emit('requester:join', data)
    s.once('requester:joined', () => resolve())
  })
}
