// درمانگر WebSocket Service
// Handles:
// 1. Real-time request broadcasting to providers (based on region + serviceType)
// 2. Real-time proposal notifications to requester
// 3. Real-time chat between requester and selected provider
// 4. Provider online/offline status

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

interface ProviderConnection {
  providerId: string
  username: string
  province: string
  city: string
  serviceType: string
  socketId: string
}

interface RequesterConnection {
  requestId: string
  requesterToken: string
  socketId: string
}

interface ChatMessagePayload {
  chatId: string
  requestId: string
  sender: 'REQUESTER' | 'PROVIDER' | 'SYSTEM'
  content: string
  timestamp: string
}

interface ProposalPayload {
  requestId: string
  providerId: string
  providerName: string
  price: number
  message?: string
  proposalId: string
}

interface NewRequestPayload {
  requestId: string
  serviceType: string
  province: string
  city: string
  region?: string
  description: string
  requesterName: string
  createdAt: string
  expiresAt: string
}

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Connected clients
const providers = new Map<string, ProviderConnection>() // providerId -> connection
const requesters = new Map<string, RequesterConnection>() // requestId -> connection
const socketToProvider = new Map<string, string>() // socketId -> providerId
const socketToRequester = new Map<string, string>() // socketId -> requestId

function log(msg: string) {
  console.log(`[WS ${new Date().toISOString()}] ${msg}`)
}

io.on('connection', (socket: Socket) => {
  log(`Connected: ${socket.id}`)

  // === Provider events ===
  socket.on('provider:join', (data: {
    providerId: string
    username: string
    province: string
    city: string
    serviceType: string
    servedNeighborhoods?: string[]
  }) => {
    const conn: ProviderConnection = {
      providerId: data.providerId,
      username: data.username,
      province: data.province,
      city: data.city,
      serviceType: data.serviceType,
      socketId: socket.id,
    }
    providers.set(data.providerId, conn)
    socketToProvider.set(socket.id, data.providerId)
    socket.join(`provider:${data.providerId}`)
    socket.join(`province:${data.province}`)
    socket.join(`city:${data.province}:${data.city}`)
    socket.join(`service:${data.serviceType}`)
    // Join a room for each served neighborhood — match key includes neighborhood
    // Request broadcasts go to: match:${province}:${city}:${serviceType}:${neighborhood}
    const neighborhoods = data.servedNeighborhoods || []
    neighborhoods.forEach((n) => {
      socket.join(`match:${data.province}:${data.city}:${data.serviceType}:${n}`)
    })
    // Also join a general match room (without neighborhood) for legacy/compat
    socket.join(`match:${data.province}:${data.city}:${data.serviceType}`)
    log(`Provider joined: ${data.username} (province=${data.province}, city=${data.city}, service=${data.serviceType}, neighborhoods=${neighborhoods.length})`)
    socket.emit('provider:joined', { ok: true })
    // Notify provider of pending active requests in their match room
    socket.emit('provider:status', {
      onlineProviders: providers.size,
      onlineRequesters: requesters.size,
    })
  })

  socket.on('provider:leave', () => {
    const providerId = socketToProvider.get(socket.id)
    if (providerId) {
      providers.delete(providerId)
      socketToProvider.delete(socket.id)
      log(`Provider left: ${providerId}`)
    }
  })

  // === Requester events ===
  socket.on('requester:join', (data: { requestId: string; requesterToken: string }) => {
    const conn: RequesterConnection = {
      ...data,
      socketId: socket.id,
    }
    requesters.set(data.requestId, conn)
    socketToRequester.set(socket.id, data.requestId)
    socket.join(`requester:${data.requestId}`)
    log(`Requester joined for request: ${data.requestId}`)
    socket.emit('requester:joined', { ok: true })
  })

  // === Broadcast new request to matching providers ===
  // Called by API after creating a request
  socket.on('admin:broadcast_request', (data: NewRequestPayload & { matchKey: string }) => {
    // matchKey = `${province}:${city}:${serviceType}` - we send to room `match:${matchKey}`
    const room = `match:${data.matchKey}`
    log(`Broadcasting request ${data.requestId} to room ${room}`)
    io.to(room).emit('provider:new_request', {
      requestId: data.requestId,
      serviceType: data.serviceType,
      province: data.province,
      city: data.city,
      region: data.region,
      description: data.description,
      requesterName: data.requesterName,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
    })
  })

  // Allow external HTTP API to broadcast via this socket connection (from Next.js API)
  // We expose a special event for the Next.js API to call
  socket.on('api:broadcast_request', (data: NewRequestPayload & { matchKey: string }) => {
    const room = `match:${data.matchKey}`
    log(`[API] Broadcasting request ${data.requestId} to room ${room}`)
    io.to(room).emit('provider:new_request', {
      requestId: data.requestId,
      serviceType: data.serviceType,
      province: data.province,
      city: data.city,
      region: data.region,
      description: data.description,
      requesterName: data.requesterName,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
    })
  })

  // === Notify requester of new proposal ===
  socket.on('api:notify_proposal', (data: ProposalPayload) => {
    log(`Notifying requester of request ${data.requestId} about new proposal from ${data.providerName}`)
    io.to(`requester:${data.requestId}`).emit('requester:new_proposal', data)
  })

  // === Notify providers that request is closed (selected or expired) ===
  socket.on('api:close_request', (data: { requestId: string; matchKey: string; reason: 'SELECTED' | 'EXPIRED' | 'CANCELLED' }) => {
    log(`Closing request ${data.requestId} (reason: ${data.reason}) - notifying room match:${data.matchKey}`)
    io.to(`match:${data.matchKey}`).emit('provider:request_closed', {
      requestId: data.requestId,
      reason: data.reason,
    })
  })

  // === Chat events ===
  socket.on('chat:join', (data: { chatId: string; requestId: string; as: 'REQUESTER' | 'PROVIDER'; providerId?: string }) => {
    socket.join(`chat:${data.chatId}`)
    log(`User joined chat ${data.chatId} as ${data.as}`)
    socket.emit('chat:joined', { chatId: data.chatId })
  })

  socket.on('chat:message', (data: ChatMessagePayload) => {
    log(`Chat message in ${data.chatId} from ${data.sender}: ${data.content.substring(0, 50)}`)
    io.to(`chat:${data.chatId}`).emit('chat:message', data)
    // Also notify the other party if they're not in the chat room
    if (data.sender === 'REQUESTER') {
      // Notify provider
      io.to(`provider:${data.chatId}`).emit('chat:notification', data)
    } else if (data.sender === 'PROVIDER') {
      // Notify requester
      io.to(`requester:${data.requestId}`).emit('chat:notification', data)
    }
  })

  socket.on('chat:typing', (data: { chatId: string; requestId: string; sender: 'REQUESTER' | 'PROVIDER' }) => {
    socket.to(`chat:${data.chatId}`).emit('chat:typing', data)
  })

  // === Disconnect ===
  socket.on('disconnect', () => {
    const providerId = socketToProvider.get(socket.id)
    if (providerId) {
      providers.delete(providerId)
      socketToProvider.delete(socket.id)
      log(`Provider disconnected: ${providerId}`)
    }
    const requestId = socketToRequester.get(socket.id)
    if (requestId) {
      requesters.delete(requestId)
      socketToRequester.delete(socket.id)
      log(`Requester disconnected: ${requestId}`)
    }
  })

  socket.on('error', (error: Error) => {
    log(`Socket error (${socket.id}): ${error.message}`)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  log(`درمانگر WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...')
  httpServer.close(() => {
    log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...')
  httpServer.close(() => {
    log('Server closed')
    process.exit(0)
  })
})
