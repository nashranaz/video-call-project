import { io } from 'socket.io-client'

export function createSocket() {
  const signalingUrl = import.meta.env.VITE_SIGNALING_URL || undefined
  return io(signalingUrl, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  })
}
