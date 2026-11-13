// WebSocket client utilities for درمانگر app

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Provider joins WebSocket
export function providerJoin(data: {
  providerId: string
  username: string
  province: string
  city: string
  serviceType: string
}) {
  const s = getSocket()
  return new Promise<void>((resolve) => {
    s.emit('provider:join', data)
    s.once('provider:joined', () => resolve())
  })
}

// Requester joins WebSocket
export function requesterJoin(data: { requestId: string; requesterToken: string }) {
  const s = getSocket()
  return new Promise<void>((resolve) => {
    s.emit('requester:join', data)
    s.once('requester:joined', () => resolve())
  })
}
