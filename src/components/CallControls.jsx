import { Camera, CameraOff, Check, Copy, Expand, Mic, MicOff, MoreVertical, MonitorUp, PhoneOff, Volume2, Video, MessageCircle, X } from 'lucide-react'
import { useState } from 'react'

function DevicePicker({ label, kind, icon: Icon, devices, selected, onChange }) {
  if (!devices.length) return null
  return (
    <label className="more-item"><Icon size={15} /><span>{label}</span>
      <select value={selected} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {devices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `${kind} ${index + 1}`}</option>)}
      </select>
    </label>
  )
}

export default function CallControls({
  muted, cameraEnabled, sharingScreen, chatOpen, unreadCount, onToggleMic, onToggleCamera,
  onToggleShare, onToggleChat, onLeave, roomId, roomUrl, devices, deviceIds,
  onSwitchCamera, onSwitchMicrophone, onSwitchSpeaker, stageRef, onNotify,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      onNotify(`${label} copied to clipboard.`, 'success')
      window.setTimeout(() => setCopied(''), 1500)
    } catch (error) {
      onNotify(`Could not copy ${label.toLowerCase()}: ${error.message}`, 'error')
    }
  }
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stageRef.current?.requestFullscreen()
    } catch (error) {
      onNotify(`Fullscreen is unavailable: ${error.message}`, 'error')
    }
  }

  return (
    <div className="call-toolbar" aria-label="Call controls">
      <button className={`control-button tip${muted ? ' active' : ''}`} data-tip={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={onToggleMic} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff size={19} /> : <Mic size={19} />}</button>
      <button className={`control-button tip${cameraEnabled ? '' : ' active'}`} data-tip={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} onClick={onToggleCamera} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>{cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}</button>
      <button className={`control-button tip${sharingScreen ? ' active' : ''}`} data-tip={sharingScreen ? 'Stop sharing' : 'Share screen'} onClick={onToggleShare} aria-label={sharingScreen ? 'Stop sharing screen' : 'Share screen'}>{sharingScreen ? <X size={18} /> : <MonitorUp size={19} />}</button>
      <button className="control-button tip chat-control" data-tip={chatOpen ? 'Close chat' : 'Open chat'} onClick={onToggleChat} aria-label={chatOpen ? 'Close chat' : 'Open chat'}><MessageCircle size={19} />{unreadCount > 0 && !chatOpen && <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
      <div className="more-control">
        <button className="control-button tip" data-tip="More options" onClick={() => setMenuOpen((open) => !open)} aria-label="More options" aria-expanded={menuOpen}><MoreVertical size={19} /></button>
        {menuOpen && <div className="more-menu" role="menu">
          <DevicePicker label="Microphone" kind="Microphone" icon={Mic} devices={devices.audioinput} selected={deviceIds.audioinput} onChange={onSwitchMicrophone} />
          <DevicePicker label="Camera" kind="Camera" icon={Video} devices={devices.videoinput} selected={deviceIds.videoinput} onChange={onSwitchCamera} />
          <DevicePicker label="Speaker" kind="Speaker" icon={Volume2} devices={devices.audiooutput} selected={deviceIds.audiooutput} onChange={onSwitchSpeaker} />
          <button className="more-item" onClick={() => copy(roomId, 'Room ID')}><Copy size={15} />{copied === 'Room ID' ? 'Room ID copied' : 'Copy room ID'}</button>
          <button className="more-item" onClick={() => copy(roomUrl, 'Invitation link')}><Copy size={15} />{copied === 'Invitation link' ? 'Link copied' : 'Copy invitation link'}</button>
          <button className="more-item" onClick={fullscreen}><Expand size={15} />Toggle fullscreen</button>
          <button className="more-item" onClick={onLeave} style={{ color: '#ff858c' }}><PhoneOff size={15} />Leave room</button>
          {menuOpen && <span className="menu-close-hint"><Check size={11} /> Options apply to this call</span>}
        </div>}
      </div>
      <button className="control-button end-call tip" data-tip="End call" onClick={onLeave} aria-label="End call"><PhoneOff size={20} /></button>
    </div>
  )
}
