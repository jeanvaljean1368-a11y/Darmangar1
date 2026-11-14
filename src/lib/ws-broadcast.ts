// Server-side helper to broadcast events to WebSocket service via socket.io-client
// The Next.js API connects as a "client" to the WS service to emit admin events

import { io, Socket } from 'socket.io-client'

let apiSocket: Socket | null = null

function getApiSocket(): Socket {
  if (!apiSocket) {
    // Connect to the WS service on port 3003
    apiSocket = io('http://localhost:3003/?XTransformPort=3003', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
    })
    apiSocket.on('connect', () => {
      console.log('[API] Connected to WS service')
    })
    apiSocket.on('disconnect', () => {
      console.log('[API] Disconnected from WS service')
    })
  }
  return apiSocket
}

export interface BroadcastRequestData {
  requestId: string
  serviceType: string
  province: string
  city: string
  region?: string
  description: string
  requesterName: string
  createdAt: string
  expiresAt: string
  matchKey: string
}

export function broadcastNewRequest(data: BroadcastRequestData): void {
  try {
    const s = getApiSocket()
    if (s.connected) {
      s.emit('api:broadcast_request', data)
    } else {
      // Wait for connection then emit
      s.once('connect', () => s.emit('api:broadcast_request', data))
    }
  } catch (e) {
    console.error('[API] broadcastNewRequest error:', e)
  }
}

export interface ProposalNotification {
  requestId: string
  providerId: string
  providerName: string
  price: number
  message?: string
  proposalId: string
}

export function notifyNewProposal(data: ProposalNotification): void {
  try {
    const s = getApiSocket()
    if (s.connected) {
      s.emit('api:notify_proposal', data)
    } else {
      s.once('connect', () => s.emit('api:notify_proposal', data))
    }
  } catch (e) {
    console.error('[API] notifyNewProposal error:', e)
  }
}

export function closeRequestBroadcast(requestId: string, matchKey: string, reason: 'SELECTED' | 'EXPIRED' | 'CANCELLED'): void {
  try {
    const s = getApiSocket()
    if (s.connected) {
      s.emit('api:close_request', { requestId, matchKey, reason })
    } else {
      s.once('connect', () => s.emit('api:close_request', { requestId, matchKey, reason }))
    }
  } catch (e) {
    console.error('[API] closeRequestBroadcast error:', e)
  }
}
