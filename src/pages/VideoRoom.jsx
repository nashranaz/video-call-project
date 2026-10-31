import { AnimatePresence, motion } from 'framer-motion'
import { Copy, PhoneOff, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CallControls from '../components/CallControls.jsx'
import ChatSidebar from '../components/ChatSidebar.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import RoomHeader from '../components/RoomHeader.jsx'
import { LocalVideo, RemoteVideo } from '../components/VideoPlayer.jsx'
import { useCallSession } from '../hooks/useCallSession.js'

function Toasts({ items, dismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {items.map((toast) => (
          <motion.div key={toast.id} className={`toast ${toast.kind}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            {toast.message}<button className="toast-dismiss" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function VideoRoom() {
  const { roomId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const participantName = (searchParams.get('name') || 'Guest').trim().slice(0, 40) || 'Guest'
  const navigate = useNavigate()
  const call = useCallSession(roomId, participantName)
  const [chatOpen, setChatOpen] = useState(true)
  const [lastReadCount, setLastReadCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const stageRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const notify = useCallback((message, kind = 'error') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4800)
  }, [])
  const dismissToast = useCallback((id) => setToasts((current) => current.filter((item) => item.id !== id)), [])
  const toggleChat = () => {
    setLastReadCount(call.messages.length)
    setChatOpen((open) => !open)
  }
  const leave = () => {
    call.leaveCall()
    navigate('/', { replace: true })
  }
  const setRemoteVideoRef = useCallback((element) => { remoteVideoRef.current = element }, [])

  const unreadCount = chatOpen ? 0 : Math.max(0, call.messages.length - lastReadCount)

  const roomValid = /^[a-zA-Z0-9_-]{4,80}$/.test(roomId)
  if (!roomValid) {
    return (
      <main className="error-screen"><section className="error-card">
        <h2>That room link doesn’t look right</h2>
        <p>Room IDs are 4–80 characters and can contain letters, numbers, dashes, or underscores.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}><Copy size={15} /> Return home</button>
      </section></main>
    )
  }

  const mobileChat = chatOpen && (
    <>
      <button className="chat-scrim" onClick={toggleChat} aria-label="Close messages" />
      <ChatSidebar messages={call.messages} name={participantName} socketId={call.socketId} onSend={call.sendMessage} onClose={toggleChat} mobile />
    </>
  )

  return (
    <main className="room-page">
      <RoomHeader roomId={roomId} status={call.status} onToggleChat={toggleChat} chatOpen={chatOpen} onNotify={notify} />
      <Toasts items={toasts} dismiss={dismissToast} />
      <ErrorMessage message={call.notice} onDismiss={() => call.setNotice('')} />
      <section className="room-content">
        <motion.div className="video-stage" ref={stageRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .3 }}>
          <RemoteVideo stream={call.remoteStream} name={call.participant || 'Participant'} connected={call.connected} audioRef={setRemoteVideoRef} />
          <LocalVideo stream={call.localPreviewStream || call.localStream} name={participantName} cameraEnabled={call.cameraEnabled || call.sharingScreen} cameraAvailable={Boolean(call.localPreviewStream?.getVideoTracks().length || call.localStream?.getVideoTracks().length)} muted={call.muted} mirror={!call.sharingScreen} />
          {!call.participant && <div className="waiting-pill">{call.status === 'Room full' ? 'This room is full' : call.status}</div>}
          {call.participant && !call.connected && <div className="waiting-pill">{call.status}</div>}
          <CallControls
            muted={call.muted}
            cameraEnabled={call.cameraEnabled}
            sharingScreen={call.sharingScreen}
            chatOpen={chatOpen}
            unreadCount={unreadCount}
            onToggleMic={call.toggleMicrophone}
            onToggleCamera={call.toggleCamera}
            onToggleShare={call.toggleScreenShare}
            onToggleChat={toggleChat}
            onLeave={leave}
            roomId={roomId}
            roomUrl={window.location.href}
            devices={call.devices}
            deviceIds={call.deviceIds}
            onSwitchCamera={call.switchCamera}
            onSwitchMicrophone={call.switchMicrophone}
            onSwitchSpeaker={async (deviceId) => {
              const video = remoteVideoRef.current
              if (!video?.setSinkId) {
                notify('Selecting a speaker is not supported by this browser.', 'error')
                return
              }
              try {
                await video.setSinkId(deviceId)
                call.setDeviceIds((current) => ({ ...current, audiooutput: deviceId }))
              } catch (error) {
                notify(`Could not select speaker: ${error.message}`, 'error')
              }
            }}
            stageRef={stageRef}
            onNotify={notify}
          />
        </motion.div>
        {chatOpen && <div className="desktop-chat"><ChatSidebar messages={call.messages} name={participantName} socketId={call.socketId} onSend={call.sendMessage} onClose={toggleChat} /></div>}
      </section>
      {mobileChat}
      {call.error && <div className="room-error-banner"><PhoneOff size={14} />{call.error}<button onClick={leave}>Leave room</button></div>}
    </main>
  )
}
