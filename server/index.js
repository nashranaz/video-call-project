import 'dotenv/config'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const port = Number(process.env.PORT || 3001)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e6,
})

app.use((request, response, next) => {
  const origin = request.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.sendStatus(204)
    return
  }
  next()
})

const rooms = new Map()
const roomPattern = /^[a-zA-Z0-9_-]{4,80}$/
const cleanName = (value) => String(value || 'Guest').trim().replace(/[<>]/g, '').slice(0, 40) || 'Guest'
const publicIceServers = [
  { urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302' },
]

if (process.env.TURN_URLS) {
  const urls = process.env.TURN_URLS.split(',').map((url) => url.trim()).filter(Boolean)
  if (urls.length) {
    publicIceServers.push({
      urls,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    })
  }
}

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', signaling: 'ready' })
})

app.get('/config/ice', (_request, response) => {
  response.json({ iceServers: publicIceServers })
})

function getRoomMembers(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  return rooms.get(roomId)
}

function leaveCurrentRoom(socket, notify = true) {
  const roomId = socket.data.roomId
  if (!roomId) return
  const members = rooms.get(roomId)
  const member = members?.get(socket.id)
  members?.delete(socket.id)
  socket.leave(roomId)
  socket.data.roomId = null
  if (notify && member) socket.to(roomId).emit('user-left', { id: socket.id, name: member.name })
  if (members?.size === 0) rooms.delete(roomId)
}

function canRelay(socket, payload) {
  const roomId = payload?.roomId
  const targetId = payload?.to
  const members = roomId && rooms.get(roomId)
  return Boolean(
    typeof roomId === 'string'
    && socket.data.roomId === roomId
    && members?.has(socket.id)
    && typeof targetId === 'string'
    && members.has(targetId)
    && targetId !== socket.id,
  )
}

io.on('connection', (socket) => {
  socket.data.roomId = null

  socket.on('join-room', async (payload = {}, acknowledge = () => {}) => {
    const roomId = String(payload.roomId || '')
    if (!roomPattern.test(roomId)) {
      acknowledge({ ok: false, error: 'Invalid room ID. Use 4–80 letters, numbers, dashes, or underscores.' })
      return
    }

    leaveCurrentRoom(socket)
    const members = getRoomMembers(roomId)
    if (members.size >= 2) {
      if (members.size === 0) rooms.delete(roomId)
      socket.emit('room-full')
      acknowledge({ ok: false, error: 'This room already has two participants.' })
      return
    }

    const participant = { id: socket.id, name: cleanName(payload.name), joinedAt: Date.now() }
    members.set(socket.id, participant)
    socket.data.roomId = roomId
    await socket.join(roomId)
    const existing = [...members.values()].filter((item) => item.id !== socket.id)
    for (const member of existing) {
      io.to(member.id).emit('user-joined', participant)
    }
    acknowledge({ ok: true, participants: existing })
  })

  socket.on('offer', (payload = {}) => {
    if (!canRelay(socket, payload) || !payload.offer?.type || !payload.offer?.sdp) return
    io.to(payload.to).emit('offer', { from: socket.id, offer: payload.offer })
  })

  socket.on('answer', (payload = {}) => {
    if (!canRelay(socket, payload) || !payload.answer?.type || !payload.answer?.sdp) return
    io.to(payload.to).emit('answer', { from: socket.id, answer: payload.answer })
  })

  socket.on('ice-candidate', (payload = {}) => {
    if (!canRelay(socket, payload) || !payload.candidate) return
    io.to(payload.to).emit('ice-candidate', { from: socket.id, candidate: payload.candidate })
  })

  socket.on('chat-message', (payload = {}) => {
    const roomId = String(payload.roomId || '')
    const members = rooms.get(roomId)
    const text = typeof payload.text === 'string' ? payload.text.trim() : ''
    const sender = members?.get(socket.id)
    if (socket.data.roomId !== roomId || !sender || !text || text.length > 2000) return
    io.to(roomId).emit('chat-message', {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: socket.id,
      senderName: sender.name,
      text,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('leave-room', () => leaveCurrentRoom(socket))
  socket.on('disconnect', () => leaveCurrentRoom(socket))
})

httpServer.listen(port, () => {
  console.log(`ConnectLive signaling server listening on http://localhost:${port}`)
})
