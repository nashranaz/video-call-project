import { Check, Copy, MessageCircle, Radio, Video } from 'lucide-react'
import { useState } from 'react'

export default function RoomHeader({ roomId, status, onToggleChat, chatOpen, onNotify }) {
  const [copied, setCopied] = useState(false)
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      onNotify('Room ID copied to clipboard.', 'success')
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      onNotify(`Could not copy the room ID: ${error.message}`, 'error')
    }
  }
  return (
    <header className="room-header">
      <div className="room-header-left">
        <a className="brand" href="/" aria-label="ConnectLive home"><span className="brand-mark"><Video size={17} /></span><span>Connect<span style={{ color: '#ab96ff' }}>Live</span></span></a>
        <div className="room-heading">
          <div className="room-title">Video call</div>
          <div className="room-subtitle">{roomId}</div>
        </div>
      </div>
      <div className="room-header-right">
        <span className="room-id-pill" title="Copy room ID"><Radio size={13} /> {status}</span>
        <button className="icon-button" onClick={copyRoomId} aria-label="Copy room ID" title={copied ? 'Copied' : 'Copy room ID'}>{copied ? <Check size={17} /> : <Copy size={17} />}</button>
        <button className="icon-button" onClick={onToggleChat} aria-label={chatOpen ? 'Close chat' : 'Open chat'} title={chatOpen ? 'Close chat' : 'Open chat'}><MessageCircle size={18} /></button>
      </div>
    </header>
  )
}
